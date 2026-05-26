# Arbitrage-Proj

This project is an Arbitrage Card Trading App for finding profitable trading card price gaps between marketplaces, starting with Pokemon cards on eBay US vs eBay UK.

## What is included

- Opportunity feed with ROI, profit, spread, liquidity, and confidence signals
- Card detail panel with regional sold-price history and marketplace listings
- Smart filters for set, rarity, price range, minimum ROI, and liquidity
- Alerts dashboard for Telegram, push, and email rules
- Portfolio/PnL tracking screen
- Mock arbitrage engine that models FX, platform fees, shipping, import duties, and confidence

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production preview

```bash
npm run build
npm run start
```

## Immediate static preview

If dependencies cannot be installed on the current machine, open `preview/index.html` directly in a browser or upload the `preview` folder to any static host.

## Live data integration path

The current app uses deterministic mock data in `lib/arbitrage.ts` so the client can preview the full workflow immediately. Replace the mock sold-listing arrays with eBay Browse/Finding API responses and FX API rates, keeping the normalized `MarketListing` shape.
