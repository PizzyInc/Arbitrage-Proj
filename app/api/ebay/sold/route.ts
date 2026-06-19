import { NextResponse } from "next/server";
import { EbayMarket, EbaySale, ebaySearchUrl } from "@/lib/ebay";

export const runtime = "nodejs";

const MARKET = {
  UK: { currency: "GBP", id: "EBAY_GB" },
  US: { currency: "USD", id: "EBAY_US" }
} as const;

type TokenCache = { accessToken: string; expiresAt: number };
type EbayItemSummary = {
  itemId: string;
  itemWebUrl?: string;
  price?: { currency?: string; value?: string };
  title?: string;
};

const tokenStore = globalThis as typeof globalThis & { ebayTokenCache?: TokenCache };

async function getAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenStore.ebayTokenCache && tokenStore.ebayTokenCache.expiresAt > Date.now() + 60_000) {
    return tokenStore.ebayTokenCache.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope"
    }),
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`eBay OAuth returned ${response.status}`);
  const payload = (await response.json()) as { access_token: string; expires_in: number };
  tokenStore.ebayTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000
  };
  return payload.access_token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const market: EbayMarket = searchParams.get("market") === "UK" ? "UK" : "US";

  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const sourceUrl = ebaySearchUrl(query, market);
  const marketConfig = MARKET[market];

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({
        average: null,
        currency: marketConfig.currency,
        market,
        query,
        sales: [],
        sourceUrl,
        warning: "Live eBay pricing requires EBAY_CLIENT_ID and EBAY_CLIENT_SECRET. Current TCGPlayer and Cardmarket prices remain available."
      });
    }

    const params = new URLSearchParams({
      q: `Pokemon Crown Zenith ${query}`,
      limit: "3",
      filter: "buyingOptions:{FIXED_PRICE}"
    });
    const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": marketConfig.id
      },
      next: { revalidate: 900 }
    });

    if (!response.ok) throw new Error(`eBay Browse API returned ${response.status}`);
    const payload = (await response.json()) as { itemSummaries?: EbayItemSummary[] };
    const sales: EbaySale[] = (payload.itemSummaries ?? [])
      .map((item) => ({
        title: item.title ?? query,
        price: Number(item.price?.value),
        currency: marketConfig.currency,
        url: item.itemWebUrl ?? sourceUrl
      }))
      .filter((item) => Number.isFinite(item.price) && item.price > 0)
      .slice(0, 3);
    const average = sales.length ? sales.reduce((sum, item) => sum + item.price, 0) / sales.length : null;

    return NextResponse.json({
      average,
      currency: marketConfig.currency,
      market,
      query,
      sales,
      sourceUrl,
      warning: sales.length ? undefined : "No matching fixed-price eBay listings were returned."
    });
  } catch (error) {
    return NextResponse.json({
      average: null,
      currency: marketConfig.currency,
      market,
      query,
      sales: [],
      sourceUrl,
      warning: error instanceof Error ? error.message : "eBay pricing is temporarily unavailable."
    });
  }
}
