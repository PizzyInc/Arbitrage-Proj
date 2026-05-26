export type Region = "US" | "UK";
export type Condition = "Raw NM" | "PSA 9" | "PSA 10" | "CGC 10";
export type Rarity = "V" | "EX" | "Full Art" | "Secret Rare" | "Alt Art" | "Promo";

export type MarketListing = {
  id: string;
  cardName: string;
  set: string;
  rarity: Rarity;
  region: Region;
  marketplace: "eBay US" | "eBay UK";
  price: number;
  currency: "USD" | "GBP";
  condition: Condition;
  soldDate: string;
  seller: string;
  volume30d: number;
  image: string;
};

export type CostSettings = {
  ebayFeePct: number;
  paymentFeePct: number;
  shippingGbp: number;
  importDutyPct: number;
  fxUsdToGbp: number;
};

export type Opportunity = {
  id: string;
  cardName: string;
  set: string;
  rarity: Rarity;
  condition: Condition;
  buyMarket: MarketListing;
  sellMarket: MarketListing;
  buyPriceGbp: number;
  sellPriceGbp: number;
  landedCostGbp: number;
  netProfitGbp: number;
  roiPct: number;
  spreadPct: number;
  confidence: number;
  liquidity: number;
  lastSeen: string;
};

export const defaultCostSettings: CostSettings = {
  ebayFeePct: 12.8,
  paymentFeePct: 2.9,
  shippingGbp: 9,
  importDutyPct: 3.5,
  fxUsdToGbp: 0.79
};

export const listings: MarketListing[] = [
  {
    id: "us-giratina-psa10",
    cardName: "Giratina VSTAR",
    set: "Crown Zenith",
    rarity: "Secret Rare",
    region: "US",
    marketplace: "eBay US",
    price: 154,
    currency: "USD",
    condition: "PSA 10",
    soldDate: "2026-05-24",
    seller: "cardvault_tx",
    volume30d: 42,
    image: "https://images.pokemontcg.io/swsh12pt5/GG69_hires.png"
  },
  {
    id: "uk-giratina-psa10",
    cardName: "Giratina VSTAR",
    set: "Crown Zenith",
    rarity: "Secret Rare",
    region: "UK",
    marketplace: "eBay UK",
    price: 178,
    currency: "GBP",
    condition: "PSA 10",
    soldDate: "2026-05-25",
    seller: "london_slabs",
    volume30d: 31,
    image: "https://images.pokemontcg.io/swsh12pt5/GG69_hires.png"
  },
  {
    id: "us-mewtwo-raw",
    cardName: "Mewtwo VSTAR",
    set: "Crown Zenith",
    rarity: "Alt Art",
    region: "US",
    marketplace: "eBay US",
    price: 63,
    currency: "USD",
    condition: "Raw NM",
    soldDate: "2026-05-25",
    seller: "socal_breaks",
    volume30d: 88,
    image: "https://images.pokemontcg.io/swsh12pt5/GG44_hires.png"
  },
  {
    id: "uk-mewtwo-raw",
    cardName: "Mewtwo VSTAR",
    set: "Crown Zenith",
    rarity: "Alt Art",
    region: "UK",
    marketplace: "eBay UK",
    price: 67,
    currency: "GBP",
    condition: "Raw NM",
    soldDate: "2026-05-24",
    seller: "collect_uk",
    volume30d: 75,
    image: "https://images.pokemontcg.io/swsh12pt5/GG44_hires.png"
  },
  {
    id: "us-charizard-psa9",
    cardName: "Charizard ex",
    set: "Obsidian Flames",
    rarity: "Full Art",
    region: "US",
    marketplace: "eBay US",
    price: 94,
    currency: "USD",
    condition: "PSA 9",
    soldDate: "2026-05-23",
    seller: "slabcentral",
    volume30d: 54,
    image: "https://images.pokemontcg.io/sv3/223_hires.png"
  },
  {
    id: "uk-charizard-psa9",
    cardName: "Charizard ex",
    set: "Obsidian Flames",
    rarity: "Full Art",
    region: "UK",
    marketplace: "eBay UK",
    price: 101,
    currency: "GBP",
    condition: "PSA 9",
    soldDate: "2026-05-25",
    seller: "gradehouse",
    volume30d: 39,
    image: "https://images.pokemontcg.io/sv3/223_hires.png"
  },
  {
    id: "us-pikachu-promo",
    cardName: "Pikachu with Grey Felt Hat",
    set: "Pokemon x Van Gogh",
    rarity: "Promo",
    region: "US",
    marketplace: "eBay US",
    price: 118,
    currency: "USD",
    condition: "Raw NM",
    soldDate: "2026-05-22",
    seller: "mintmailday",
    volume30d: 63,
    image: "https://images.pokemontcg.io/svp/SV085_hires.png"
  },
  {
    id: "uk-pikachu-promo",
    cardName: "Pikachu with Grey Felt Hat",
    set: "Pokemon x Van Gogh",
    rarity: "Promo",
    region: "UK",
    marketplace: "eBay UK",
    price: 119,
    currency: "GBP",
    condition: "Raw NM",
    soldDate: "2026-05-26",
    seller: "brighton_cards",
    volume30d: 58,
    image: "https://images.pokemontcg.io/svp/SV085_hires.png"
  },
  {
    id: "us-umbreon-psa10",
    cardName: "Umbreon VMAX",
    set: "Evolving Skies",
    rarity: "Alt Art",
    region: "US",
    marketplace: "eBay US",
    price: 1640,
    currency: "USD",
    condition: "PSA 10",
    soldDate: "2026-05-20",
    seller: "premium_slabs",
    volume30d: 19,
    image: "https://images.pokemontcg.io/swsh7/215_hires.png"
  },
  {
    id: "uk-umbreon-psa10",
    cardName: "Umbreon VMAX",
    set: "Evolving Skies",
    rarity: "Alt Art",
    region: "UK",
    marketplace: "eBay UK",
    price: 1545,
    currency: "GBP",
    condition: "PSA 10",
    soldDate: "2026-05-25",
    seller: "north_slabs",
    volume30d: 13,
    image: "https://images.pokemontcg.io/swsh7/215_hires.png"
  }
];

export const liveMarketplaceListings = [
  {
    id: "live-1",
    platform: "Courtyard",
    cardName: "Giratina VSTAR",
    condition: "PSA 10",
    askGbp: 132,
    estimatedValueGbp: 178,
    timeRemaining: "Buy now",
    signal: "Under market by 26%"
  },
  {
    id: "live-2",
    platform: "CollectorsCrypt",
    cardName: "Mewtwo VSTAR",
    condition: "Raw NM",
    askGbp: 48,
    estimatedValueGbp: 67,
    timeRemaining: "14m 22s",
    signal: "Snipe candidate"
  },
  {
    id: "live-3",
    platform: "Beezie",
    cardName: "Charizard ex",
    condition: "PSA 9",
    askGbp: 78,
    estimatedValueGbp: 101,
    timeRemaining: "2h 05m",
    signal: "Bid if ROI > 25%"
  }
];

export const portfolio = [
  {
    id: "pf-1",
    cardName: "Mewtwo VSTAR",
    costGbp: 52,
    marketValueGbp: 67,
    acquired: "2026-05-19",
    status: "Listed"
  },
  {
    id: "pf-2",
    cardName: "Pikachu with Grey Felt Hat",
    costGbp: 101,
    marketValueGbp: 119,
    acquired: "2026-05-16",
    status: "Holding"
  },
  {
    id: "pf-3",
    cardName: "Charizard ex",
    costGbp: 82,
    marketValueGbp: 101,
    acquired: "2026-05-21",
    status: "Ready to sell"
  }
];

export function toGbp(listing: MarketListing, fxUsdToGbp: number) {
  return listing.currency === "GBP" ? listing.price : listing.price * fxUsdToGbp;
}

export function buildOpportunities(settings: CostSettings = defaultCostSettings): Opportunity[] {
  const grouped = new Map<string, MarketListing[]>();

  for (const listing of listings) {
    const key = `${listing.cardName}-${listing.condition}`;
    grouped.set(key, [...(grouped.get(key) ?? []), listing]);
  }

  return [...grouped.values()]
    .map((group) => {
      const us = group.find((listing) => listing.region === "US");
      const uk = group.find((listing) => listing.region === "UK");

      if (!us || !uk) return null;

      const buyPriceGbp = toGbp(us, settings.fxUsdToGbp);
      const sellPriceGbp = toGbp(uk, settings.fxUsdToGbp);
      const duty = buyPriceGbp * (settings.importDutyPct / 100);
      const landedCostGbp = buyPriceGbp + settings.shippingGbp + duty;
      const saleFees = sellPriceGbp * ((settings.ebayFeePct + settings.paymentFeePct) / 100);
      const netProfitGbp = sellPriceGbp - saleFees - landedCostGbp;
      const roiPct = (netProfitGbp / landedCostGbp) * 100;
      const spreadPct = ((sellPriceGbp - buyPriceGbp) / buyPriceGbp) * 100;
      const liquidity = Math.min(us.volume30d, uk.volume30d);
      const confidence = Math.max(
        42,
        Math.min(96, Math.round(52 + liquidity * 0.45 + Math.max(0, roiPct) * 0.72))
      );

      return {
        id: `${us.id}-${uk.id}`,
        cardName: us.cardName,
        set: us.set,
        rarity: us.rarity,
        condition: us.condition,
        buyMarket: us,
        sellMarket: uk,
        buyPriceGbp,
        sellPriceGbp,
        landedCostGbp,
        netProfitGbp,
        roiPct,
        spreadPct,
        confidence,
        liquidity,
        lastSeen: uk.soldDate > us.soldDate ? uk.soldDate : us.soldDate
      };
    })
    .filter((item): item is Opportunity => Boolean(item))
    .sort((a, b) => b.netProfitGbp - a.netProfitGbp);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
