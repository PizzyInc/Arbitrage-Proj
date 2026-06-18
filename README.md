# Arbitrage-Proj

ArbiCards is a trading-card intelligence dashboard for spotting market spreads, checking sold comps, and moving quickly on Pokemon card opportunities across US and UK marketplaces.

## What is included

- Crown Zenith watchlist with live card data
- Direct eBay US and UK active/sold search links for each card
- Last-three-sold comp checks with average pricing when eBay can be parsed
- Modeled opportunity feed with ROI, spread, liquidity, and confidence signals
- Alert hub for Telegram and installed-app push notifications
- Holdings and PnL tracking
- Cost model for FX, platform fees, shipping, duties, and resale margin

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

The app uses PokemonTCG data for the Crown Zenith watchlist, direct eBay links for live research, and a best-effort sold-comps parser for recent sales. Replace the mock opportunity arrays in `lib/arbitrage.ts` with authenticated eBay and FX API responses when moving from preview to production-grade market data.
