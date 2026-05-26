"use client";

import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Clock3,
  Gauge,
  LineChart,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildOpportunities,
  defaultCostSettings,
  formatMoney,
  formatPercent,
  liveMarketplaceListings,
  Opportunity,
  portfolio,
  Rarity
} from "@/lib/arbitrage";

type Tab = "feed" | "detail" | "marketplaces" | "alerts" | "portfolio";

const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "feed", label: "Feed", icon: Activity },
  { id: "detail", label: "Card", icon: Search },
  { id: "marketplaces", label: "Listings", icon: Target },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "portfolio", label: "PnL", icon: BriefcaseBusiness }
];

const sets = ["All sets", "Crown Zenith", "Obsidian Flames", "Pokemon x Van Gogh", "Evolving Skies"];
const rarities: Array<Rarity | "All rarity"> = ["All rarity", "V", "EX", "Full Art", "Secret Rare", "Alt Art", "Promo"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [selectedId, setSelectedId] = useState<string>("");
  const [setFilter, setSetFilter] = useState("All sets");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "All rarity">("All rarity");
  const [minRoi, setMinRoi] = useState(10);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minVolume, setMinVolume] = useState(10);
  const [settings, setSettings] = useState(defaultCostSettings);
  const [lastRefresh, setLastRefresh] = useState("26 May 2026, 11:42");

  const opportunities = useMemo(() => buildOpportunities(settings), [settings]);
  const filtered = opportunities.filter((opportunity) => {
    const setMatch = setFilter === "All sets" || opportunity.set === setFilter;
    const rarityMatch = rarityFilter === "All rarity" || opportunity.rarity === rarityFilter;
    return (
      setMatch &&
      rarityMatch &&
      opportunity.roiPct >= minRoi &&
      opportunity.sellPriceGbp <= maxPrice &&
      opportunity.liquidity >= minVolume
    );
  });
  const selected = opportunities.find((opportunity) => opportunity.id === selectedId) ?? filtered[0] ?? opportunities[0];
  const totalProfit = filtered.reduce((sum, opportunity) => sum + Math.max(0, opportunity.netProfitGbp), 0);
  const averageRoi = filtered.length
    ? filtered.reduce((sum, opportunity) => sum + opportunity.roiPct, 0) / filtered.length
    : 0;
  const portfolioValue = portfolio.reduce((sum, item) => sum + item.marketValueGbp, 0);
  const portfolioCost = portfolio.reduce((sum, item) => sum + item.costGbp, 0);

  function refreshData() {
    setLastRefresh(
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date())
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>ArbiCards</strong>
            <small>Card trading intelligence</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? "nav-item active" : "nav-item"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-panel">
          <span className="panel-label">Automation</span>
          <div className="status-row">
            <Bot size={18} />
            <div>
              <strong>Telegram ready</strong>
              <small>Webhook placeholder configured</small>
            </div>
          </div>
          <div className="status-row">
            <ShieldCheck size={18} />
            <div>
              <strong>Manual mode</strong>
              <small>Auto-buy disabled for MVP</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">eBay US to eBay UK arbitrage</p>
            <h1>Opportunities ranked by net profit after costs</h1>
          </div>
          <button className="primary-button" onClick={refreshData} type="button">
            <RefreshCcw size={17} />
            Refresh
          </button>
        </header>

        <section className="metric-grid" aria-label="Summary metrics">
          <Metric icon={TrendingUp} label="Filtered profit" value={formatMoney(totalProfit)} detail="Potential gross signal" />
          <Metric icon={Gauge} label="Average ROI" value={formatPercent(averageRoi)} detail="After fees and shipping" />
          <Metric icon={Zap} label="Live signals" value={String(filtered.length)} detail="Above filter threshold" />
          <Metric icon={Clock3} label="Last refresh" value={lastRefresh} detail="Manual MVP refresh" />
        </section>

        <div className="content-grid">
          <aside className="filters-panel">
            <div className="section-title">
              <SlidersHorizontal size={18} />
              <h2>Smart filters</h2>
            </div>

            <label>
              Set
              <select value={setFilter} onChange={(event) => setSetFilter(event.target.value)}>
                {sets.map((set) => (
                  <option key={set}>{set}</option>
                ))}
              </select>
            </label>

            <label>
              Rarity
              <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value as Rarity | "All rarity")}>
                {rarities.map((rarity) => (
                  <option key={rarity}>{rarity}</option>
                ))}
              </select>
            </label>

            <RangeControl label="Minimum ROI" value={minRoi} min={0} max={45} suffix="%" onChange={setMinRoi} />
            <RangeControl label="Max resale price" value={maxPrice} min={50} max={1800} prefix="£" onChange={setMaxPrice} />
            <RangeControl label="Min liquidity" value={minVolume} min={0} max={90} suffix=" sales" onChange={setMinVolume} />

            <div className="section-title cost-heading">
              <Settings2 size={18} />
              <h2>Cost model</h2>
            </div>
            <NumberControl label="FX USD to GBP" value={settings.fxUsdToGbp} step={0.01} onChange={(fxUsdToGbp) => setSettings({ ...settings, fxUsdToGbp })} />
            <NumberControl label="eBay fee %" value={settings.ebayFeePct} step={0.1} onChange={(ebayFeePct) => setSettings({ ...settings, ebayFeePct })} />
            <NumberControl label="Shipping GBP" value={settings.shippingGbp} step={1} onChange={(shippingGbp) => setSettings({ ...settings, shippingGbp })} />
            <NumberControl label="Import duty %" value={settings.importDutyPct} step={0.1} onChange={(importDutyPct) => setSettings({ ...settings, importDutyPct })} />
          </aside>

          <section className="main-panel">
            {activeTab === "feed" && (
              <OpportunityFeed
                opportunities={filtered}
                selected={selected}
                onSelect={(opportunity) => {
                  setSelectedId(opportunity.id);
                  setActiveTab("detail");
                }}
              />
            )}
            {activeTab === "detail" && selected && <CardDetail opportunity={selected} />}
            {activeTab === "marketplaces" && <MarketplaceListings />}
            {activeTab === "alerts" && <AlertsDashboard selected={selected} />}
            {activeTab === "portfolio" && (
              <PortfolioPanel portfolioCost={portfolioCost} portfolioValue={portfolioValue} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return (
    <article className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  prefix = "",
  suffix = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="label-row">
        {label}
        <strong>
          {prefix}
          {value}
          {suffix}
        </strong>
      </span>
      <input min={min} max={max} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function NumberControl({
  label,
  value,
  step,
  onChange
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-control">
      {label}
      <input step={step} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function OpportunityFeed({
  opportunities,
  selected,
  onSelect
}: {
  opportunities: Opportunity[];
  selected?: Opportunity;
  onSelect: (opportunity: Opportunity) => void;
}) {
  return (
    <>
      <div className="section-title">
        <LineChart size={18} />
        <h2>Opportunity feed</h2>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Buy</th>
              <th>Sell</th>
              <th>Profit</th>
              <th>ROI</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => (
              <tr
                className={selected?.id === opportunity.id ? "selected-row" : ""}
                key={opportunity.id}
                onClick={() => onSelect(opportunity)}
              >
                <td>
                  <strong>{opportunity.cardName}</strong>
                  <small>
                    {opportunity.set} / {opportunity.condition}
                  </small>
                </td>
                <td>
                  <strong>{formatMoney(opportunity.landedCostGbp)}</strong>
                  <small>{opportunity.buyMarket.marketplace}</small>
                </td>
                <td>
                  <strong>{formatMoney(opportunity.sellPriceGbp)}</strong>
                  <small>{opportunity.sellMarket.marketplace}</small>
                </td>
                <td className={opportunity.netProfitGbp > 0 ? "positive" : "negative"}>{formatMoney(opportunity.netProfitGbp)}</td>
                <td>{formatPercent(opportunity.roiPct)}</td>
                <td>
                  <span className="confidence">{opportunity.confidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!opportunities.length && <p className="empty-state">No opportunities match the current filters.</p>}
      </div>
    </>
  );
}

function CardDetail({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="detail-layout">
      <div className="card-visual">
        <img alt={opportunity.cardName} src={opportunity.buyMarket.image} />
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{opportunity.set}</p>
        <h2>{opportunity.cardName}</h2>
        <div className="pill-row">
          <span>{opportunity.rarity}</span>
          <span>{opportunity.condition}</span>
          <span>{opportunity.liquidity} sales / 30d</span>
        </div>
        <div className="detail-stats">
          <Metric icon={Target} label="Buy market" value={formatMoney(opportunity.buyPriceGbp)} detail={opportunity.buyMarket.marketplace} />
          <Metric icon={TrendingUp} label="Sell market" value={formatMoney(opportunity.sellPriceGbp)} detail={opportunity.sellMarket.marketplace} />
          <Metric icon={Gauge} label="Net profit" value={formatMoney(opportunity.netProfitGbp)} detail={formatPercent(opportunity.roiPct)} />
        </div>
        <div className="timeline">
          <div>
            <strong>US last sold</strong>
            <span>{opportunity.buyMarket.soldDate} by {opportunity.buyMarket.seller}</span>
          </div>
          <div>
            <strong>UK last sold</strong>
            <span>{opportunity.sellMarket.soldDate} by {opportunity.sellMarket.seller}</span>
          </div>
          <div>
            <strong>Signal</strong>
            <span>{formatPercent(opportunity.spreadPct)} regional spread with {opportunity.confidence}/100 confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceListings() {
  return (
    <>
      <div className="section-title">
        <Target size={18} />
        <h2>Marketplace listings</h2>
      </div>
      <div className="listing-grid">
        {liveMarketplaceListings.map((listing) => (
          <article className="listing-card" key={listing.id}>
            <span>{listing.platform}</span>
            <h3>{listing.cardName}</h3>
            <small>{listing.condition}</small>
            <div className="listing-values">
              <strong>{formatMoney(listing.askGbp)}</strong>
              <span>Market {formatMoney(listing.estimatedValueGbp)}</span>
            </div>
            <div className="signal-row">
              <Clock3 size={16} />
              <span>{listing.timeRemaining}</span>
            </div>
            <button type="button">{listing.signal}</button>
          </article>
        ))}
      </div>
    </>
  );
}

function AlertsDashboard({ selected }: { selected?: Opportunity }) {
  const alertRules = [
    "New arbitrage opportunity over 20% ROI",
    "Watched card drops below target buy price",
    "Auction ending soon with positive spread",
    "Portfolio spread widens by 10%"
  ];

  return (
    <div>
      <div className="section-title">
        <Bell size={18} />
        <h2>Alerts dashboard</h2>
      </div>
      <div className="alert-layout">
        <article className="telegram-panel">
          <Bot size={26} />
          <h3>Telegram bot</h3>
          <p>Connect a bot token and chat ID on the host to send high-signal alerts into your trading workflow.</p>
          <code>POST /api/alerts/telegram</code>
          <button type="button">Send test alert</button>
        </article>
        <div className="rule-list">
          {alertRules.map((rule, index) => (
            <label className="toggle-row" key={rule}>
              <input defaultChecked={index < 3} type="checkbox" />
              <span>{rule}</span>
            </label>
          ))}
        </div>
      </div>
      {selected && (
        <div className="watch-card">
          <strong>Current watch target</strong>
          <span>
            {selected.cardName}: alert when ROI stays above {Math.max(20, Math.round(selected.roiPct))}% or US landed cost falls below{" "}
            {formatMoney(selected.landedCostGbp * 0.94)}.
          </span>
        </div>
      )}
    </div>
  );
}

function PortfolioPanel({ portfolioCost, portfolioValue }: { portfolioCost: number; portfolioValue: number }) {
  return (
    <>
      <div className="section-title">
        <BriefcaseBusiness size={18} />
        <h2>Portfolio / PnL</h2>
      </div>
      <section className="portfolio-summary">
        <Metric icon={BriefcaseBusiness} label="Inventory cost" value={formatMoney(portfolioCost)} detail="Tracked purchases" />
        <Metric icon={TrendingUp} label="Market value" value={formatMoney(portfolioValue)} detail="Estimated resale" />
        <Metric icon={Gauge} label="Unrealized PnL" value={formatMoney(portfolioValue - portfolioCost)} detail={formatPercent(((portfolioValue - portfolioCost) / portfolioCost) * 100)} />
      </section>
      <div className="portfolio-list">
        {portfolio.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.cardName}</strong>
              <small>Acquired {item.acquired}</small>
            </div>
            <span>{item.status}</span>
            <strong>{formatMoney(item.marketValueGbp - item.costGbp)}</strong>
          </article>
        ))}
      </div>
    </>
  );
}
