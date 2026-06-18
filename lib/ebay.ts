export type EbayMarket = "US" | "UK";

export type EbaySale = {
  title: string;
  price: number;
  currency: "USD" | "GBP";
  url: string;
};

export type EbaySoldResponse = {
  average: number | null;
  currency: "USD" | "GBP";
  market: EbayMarket;
  query: string;
  sales: EbaySale[];
  sourceUrl: string;
  warning?: string;
};

export function ebaySearchUrl(cardName: string, market: EbayMarket) {
  const host = market === "UK" ? "https://www.ebay.co.uk" : "https://www.ebay.com";
  const query = encodeURIComponent(`Pokemon Crown Zenith ${cardName}`);
  return `${host}/sch/i.html?_nkw=${query}&_sacat=0`;
}

export function ebaySoldUrl(cardName: string, market: EbayMarket) {
  return `${ebaySearchUrl(cardName, market)}&LH_Sold=1&LH_Complete=1&_ipg=60`;
}
