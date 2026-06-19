import { NextResponse } from "next/server";
import { EbayMarket, EbaySale, ebaySoldUrl } from "@/lib/ebay";

const MARKET_CURRENCY = {
  UK: "GBP",
  US: "USD"
} as const;

// Rotate user agents to reduce blocking
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0"
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseSales(html: string, market: EbayMarket): EbaySale[] {
  const currency = MARKET_CURRENCY[market];
  const itemBlocks = html.match(/<li[^>]*class="[^"]*s-item[^"]*"[\s\S]*?<\/li>/gi) ?? [];
  const sales: EbaySale[] = [];
  const pricePattern =
    market === "UK"
      ? /(?:£|GBP\s*)([\d,.]+)/
      : /(?:US\s*)?\$([\d,.]+)/;

  for (const block of itemBlocks) {
    const titleMatch =
      block.match(/<div[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ??
      block.match(/<span[^>]*role="heading"[^>]*>([\s\S]*?)<\/span>/i);
    const linkMatch = block.match(/<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/i);
    const priceMatch = block.match(pricePattern);

    if (!titleMatch || !linkMatch || !priceMatch) continue;

    const title = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    const price = Number(priceMatch[1].replace(/,/g, ""));

    if (!title || title.toLowerCase() === "shop on ebay" || Number.isNaN(price)) continue;

    sales.push({
      title,
      price,
      currency,
      url: decodeHtml(linkMatch[1])
    });

    if (sales.length === 3) break;
  }

  return sales;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const market = searchParams.get("market") === "UK" ? "UK" : "US";

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const sourceUrl = ebaySoldUrl(query, market);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": market === "UK" ? "en-GB,en;q=0.9" : "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": market === "UK" ? "https://www.ebay.co.uk/" : "https://www.ebay.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "max-age=0"
      },
      next: {
        revalidate: 900
      }
    });

    if (response.status === 403) {
      return NextResponse.json(
        {
          average: null,
          currency: MARKET_CURRENCY[market],
          market,
          query,
          sales: [],
          sourceUrl,
          warning: "eBay blocked this request (403). Please open the link directly to view sold listings and search for comps manually."
        },
        { status: 200 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          average: null,
          currency: MARKET_CURRENCY[market],
          market,
          query,
          sales: [],
          sourceUrl,
          warning: `eBay returned ${response.status}. Open the sold-search link for live results.`
        },
        { status: 200 }
      );
    }

    const html = await response.text();
    const sales = parseSales(html, market);
    const average = sales.length
      ? sales.reduce((sum, sale) => sum + sale.price, 0) / sales.length
      : null;

    return NextResponse.json({
      average,
      currency: MARKET_CURRENCY[market],
      market,
      query,
      sales,
      sourceUrl,
      warning: sales.length ? undefined : "No sold items could be parsed from eBay. Open the sold-search link for live results."
    });
  } catch (error) {
    return NextResponse.json({
      average: null,
      currency: MARKET_CURRENCY[market],
      market,
      query,
      sales: [],
      sourceUrl,
      warning: `Could not fetch eBay sold results: ${error instanceof Error ? error.message : "Unknown error"}. Open the sold-search link for live results.`
    });
  }
}
