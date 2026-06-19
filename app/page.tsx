"use client";

import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  Gauge,
  LineChart,
  Loader2,
  Menu,
  X,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { EbayMarket, EbaySoldResponse, ebaySearchUrl, ebaySoldUrl } from "@/lib/ebay";

type Tab = "crown" | "targeted" | "feed" | "detail" | "marketplaces" | "alerts" | "portfolio";
type SoldComps = {
  US?: EbaySoldResponse;
  UK?: EbaySoldResponse;
  loading?: boolean;
};
type GradeProfile = "Raw" | "PSA 10" | "PSA 9" | "CGC 10" | "CGC 9" | "ACE 10" | "ACE 9";
type SortMode = "number" | "priceHigh" | "priceLow" | "biggestMargin" | "gradeHigh";
type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: Record<string, string>;
};
type CrownZenithCard = {
  id: string;
  name: string;
  number: string;
  subset?: string;
  rarity?: string;
  images?: {
    small?: string;
  };
  tcgplayer?: {
    prices?: Record<string, { market?: number }>;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
    };
  };
};

const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "crown", label: "Crown", icon: Search },
  { id: "targeted", label: "Targeted", icon: Target },
  { id: "feed", label: "Feed", icon: Activity },
  { id: "detail", label: "Card", icon: Search },
  { id: "marketplaces", label: "Listings", icon: Target },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "portfolio", label: "PnL", icon: BriefcaseBusiness }
];

const sets = ["All sets", "Crown Zenith", "Obsidian Flames", "Pokemon x Van Gogh", "Evolving Skies"];
const crownZenithSubsets = ["All subsets", "Base Set", "Galarian Gallery"];
const rarities: Array<Rarity | "All rarity"> = ["All rarity", "V", "EX", "Full Art", "Secret Rare", "Alt Art", "Promo"];
const gradeProfiles: GradeProfile[] = ["Raw", "PSA 10", "PSA 9", "CGC 10", "CGC 9", "ACE 10", "ACE 9"];
const sortOptions: Array<{ label: string; value: SortMode }> = [
  { label: "Set number", value: "number" },
  { label: "Price high", value: "priceHigh" },
  { label: "Price low", value: "priceLow" },
  { label: "Biggest margin", value: "biggestMargin" },
  { label: "Grade high-low", value: "gradeHigh" }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("crown");
  const [selectedId, setSelectedId] = useState<string>("");
  const [cardSearch, setCardSearch] = useState("");
  const [crownCards, setCrownCards] = useState<CrownZenithCard[]>([]);
  const [crownError, setCrownError] = useState("");
  const [crownLoading, setCrownLoading] = useState(true);
  const [soldComps, setSoldComps] = useState<Record<string, SoldComps>>({});
  const [gradeProfile, setGradeProfile] = useState<GradeProfile>("Raw");
  const [sortMode, setSortMode] = useState<SortMode>("number");
  const [targetedIds, setTargetedIds] = useState<string[]>([]);
  const [setFilter, setSetFilter] = useState("All sets");
  const [subsetFilter, setSubsetFilter] = useState("All subsets");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "All rarity">("All rarity");
  const [minRoi, setMinRoi] = useState(10);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minVolume, setMinVolume] = useState(10);
  const [settings, setSettings] = useState(defaultCostSettings);
  const [lastRefresh, setLastRefresh] = useState("26 May 2026, 11:42");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const searchedCrownCards = useMemo(
    () =>
      sortCards(
        crownCards.filter((card) => {
          const nameMatch = card.name.toLowerCase().includes(cardSearch.trim().toLowerCase());
          const subsetMatch = setFilter === "Crown Zenith" 
            ? (subsetFilter === "All subsets" || card.subset === subsetFilter.replace(" ", ""))
            : true;
          return nameMatch && subsetMatch;
        }),
        sortMode,
        soldComps,
        settings.fxUsdToGbp,
        gradeProfile
      ),
    [cardSearch, crownCards, gradeProfile, settings.fxUsdToGbp, soldComps, sortMode, subsetFilter, setFilter]
  );
  const targetedCards = useMemo(
    () =>
      sortCards(
        crownCards.filter((card) => targetedIds.includes(card.id)),
        sortMode,
        soldComps,
        settings.fxUsdToGbp,
        gradeProfile
      ),
    [crownCards, gradeProfile, settings.fxUsdToGbp, soldComps, sortMode, targetedIds]
  );

  useEffect(() => {
    let mounted = true;

    fetch("/api/cards/crown-zenith")
      .then((response) => {
        if (!response.ok) throw new Error(`Card API returned ${response.status}`);
        return response.json() as Promise<{ data: CrownZenithCard[]; error?: string }>;
      })
      .then((payload) => {
        if (!mounted) return;
        if (payload.error) throw new Error(payload.error);
        setCrownCards(payload.data ?? []);
        setCrownError("");
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setCrownError(error.message);
      })
      .finally(() => {
        if (mounted) setCrownLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("arbicards-targeted");
    if (saved) {
      setTargetedIds(JSON.parse(saved) as string[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("arbicards-targeted", JSON.stringify(targetedIds));
  }, [targetedIds]);

  useEffect(() => {
    if (setFilter !== "Crown Zenith") {
      setSubsetFilter("All subsets");
    }
  }, [setFilter]);

  async function loadSoldComps(card: CrownZenithCard) {
    setSoldComps((current) => ({
      ...current,
      [card.id]: {
        ...current[card.id],
        loading: true
      }
    }));

    const fetchMarket = (market: EbayMarket) =>
      fetch(`/api/ebay/sold?${new URLSearchParams({ market, query: buildCardQuery(card.name, gradeProfile) }).toString()}`).then(
        (response) => response.json() as Promise<EbaySoldResponse>
      );

    const [us, uk] = await Promise.allSettled([fetchMarket("US"), fetchMarket("UK")]);

    setSoldComps((current) => ({
      ...current,
      [card.id]: {
        loading: false,
        US: us.status === "fulfilled" ? us.value : undefined,
        UK: uk.status === "fulfilled" ? uk.value : undefined
      }
    }));
  }

  async function loadVisibleSoldComps() {
    const visibleCards = activeTab === "targeted" ? targetedCards : searchedCrownCards;
    const cardsToLoad = visibleCards
      .filter((card) => !soldComps[card.id]?.loading && (!soldComps[card.id]?.US || !soldComps[card.id]?.UK))
      .slice(0, 12);

    for (const card of cardsToLoad) {
      await loadSoldComps(card);
    }
  }

  function toggleTargeted(card: CrownZenithCard) {
    setTargetedIds((current) =>
      current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id]
    );
  }

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
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        type="button"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>ArbiCards</strong>
            <small>Card market intelligence</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? "nav-item active" : "nav-item"}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
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
          <span className="panel-label">Alert channels</span>
          <div className="status-row">
            <Bot size={18} />
            <div>
              <strong>Telegram signals</strong>
              <small>Route high-value spreads to chat</small>
            </div>
          </div>
          <div className="status-row">
            <ShieldCheck size={18} />
            <div>
              <strong>Push ready</strong>
              <small>Install the app for phone alerts</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Pokemon card market intelligence</p>
            <h1>Find underpriced Crown Zenith cards before the spread closes</h1>
          </div>
          <button className="primary-button" onClick={refreshData} type="button">
            <RefreshCcw size={17} />
            Sync market view
          </button>
        </header>

        <section className="metric-grid" aria-label="Summary metrics">
          <Metric icon={Search} label="Set coverage" value={String(crownCards.length || "...")} detail="Crown Zenith cards tracked" />
          <Metric icon={TrendingUp} label="Opportunity value" value={formatMoney(totalProfit)} detail="Modeled profit after costs" />
          <Metric icon={Gauge} label="Avg signal ROI" value={formatPercent(averageRoi)} detail="Current filtered opportunities" />
          <Metric icon={Clock3} label="Last synced" value={lastRefresh} detail="Manual market refresh" />
        </section>

        <div className="content-grid">
          <aside className="filters-panel">
            <div className="section-title">
              <SlidersHorizontal size={18} />
              <h2>Opportunity filters</h2>
            </div>

            <label>
              Set
              <select value={setFilter} onChange={(event) => setSetFilter(event.target.value)}>
                {sets.map((set) => (
                  <option key={set}>{set}</option>
                ))}
              </select>
            </label>

            {setFilter === "Crown Zenith" && (
              <label>
                Subset
                <select value={subsetFilter} onChange={(event) => setSubsetFilter(event.target.value)}>
                  {crownZenithSubsets.map((subset) => (
                    <option key={subset}>{subset}</option>
                  ))}
                </select>
              </label>
            )}

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
              <h2>Cost assumptions</h2>
            </div>
            <NumberControl label="FX USD to GBP" value={settings.fxUsdToGbp} step={0.01} onChange={(fxUsdToGbp) => setSettings({ ...settings, fxUsdToGbp })} />
            <NumberControl label="eBay fee %" value={settings.ebayFeePct} step={0.1} onChange={(ebayFeePct) => setSettings({ ...settings, ebayFeePct })} />
            <NumberControl label="Shipping GBP" value={settings.shippingGbp} step={1} onChange={(shippingGbp) => setSettings({ ...settings, shippingGbp })} />
            <NumberControl label="Import duty %" value={settings.importDutyPct} step={0.1} onChange={(importDutyPct) => setSettings({ ...settings, importDutyPct })} />
          </aside>

          <section className="main-panel">
            {activeTab === "crown" && (
              <CrownZenithBrowser
                cards={searchedCrownCards}
                error={crownError}
                gradeProfile={gradeProfile}
                isTargetedView={false}
                loading={crownLoading}
                onLoadVisibleSoldComps={loadVisibleSoldComps}
                onLoadSoldComps={loadSoldComps}
                onGradeProfileChange={setGradeProfile}
                search={cardSearch}
                soldComps={soldComps}
                sortMode={sortMode}
                targetedIds={targetedIds}
                totalCards={crownCards.length}
                onSearch={setCardSearch}
                onSortModeChange={setSortMode}
                onToggleTargeted={toggleTargeted}
                fxUsdToGbp={settings.fxUsdToGbp}
              />
            )}
            {activeTab === "targeted" && (
              <CrownZenithBrowser
                cards={targetedCards}
                error={crownError}
                gradeProfile={gradeProfile}
                isTargetedView
                loading={crownLoading}
                onLoadVisibleSoldComps={loadVisibleSoldComps}
                onLoadSoldComps={loadSoldComps}
                onGradeProfileChange={setGradeProfile}
                search={cardSearch}
                soldComps={soldComps}
                sortMode={sortMode}
                targetedIds={targetedIds}
                totalCards={targetedIds.length}
                onSearch={setCardSearch}
                onSortModeChange={setSortMode}
                onToggleTargeted={toggleTargeted}
                fxUsdToGbp={settings.fxUsdToGbp}
              />
            )}
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

function CrownZenithBrowser({
  cards,
  error,
  fxUsdToGbp,
  gradeProfile,
  isTargetedView,
  loading,
  onGradeProfileChange,
  onLoadVisibleSoldComps,
  onLoadSoldComps,
  onSearch,
  onSortModeChange,
  onToggleTargeted,
  search,
  soldComps,
  sortMode,
  targetedIds,
  totalCards
}: {
  cards: CrownZenithCard[];
  error: string;
  fxUsdToGbp: number;
  gradeProfile: GradeProfile;
  isTargetedView: boolean;
  loading: boolean;
  onGradeProfileChange: (value: GradeProfile) => void;
  onLoadVisibleSoldComps: () => void;
  onLoadSoldComps: (card: CrownZenithCard) => void;
  onSearch: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
  onToggleTargeted: (card: CrownZenithCard) => void;
  search: string;
  soldComps: Record<string, SoldComps>;
  sortMode: SortMode;
  targetedIds: string[];
  totalCards: number;
}) {
  return (
    <>
      <div className="section-title split-title">
        <div>
          <div className="section-title">
            <Search size={18} />
            <h2>{isTargetedView ? "Targeted cards" : "Crown Zenith watchlist"}</h2>
          </div>
          <small>
            {loading
              ? "Building the set watchlist..."
              : isTargetedView
                ? `${cards.length} saved targets`
                : `${cards.length} of ${totalCards} cards in view`}
          </small>
        </div>
        <label className="search-field" aria-label="Search Crown Zenith cards">
          <Search size={16} />
          <input
            placeholder="Search cards by name"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
        <button className="secondary-button" disabled={loading || cards.length === 0} onClick={onLoadVisibleSoldComps} type="button">
          <RefreshCcw size={15} />
          Load comps for view
        </button>
      </div>

      <div className="control-strip">
        <label>
          Grade profile
          <select value={gradeProfile} onChange={(event) => onGradeProfileChange(event.target.value as GradeProfile)}>
            {gradeProfiles.map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
        <label>
          Sort cards
          <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="empty-state">Crown Zenith data is unavailable right now: {error}</p>}
      {loading && (
        <div className="loading-state">
          <Loader2 size={18} />
          <span>Pulling live Crown Zenith card data...</span>
        </div>
      )}

      {!loading && !error && (
        <div className="crown-grid">
          {cards.map((card) => (
            <CrownCardRow
              card={card}
              fxUsdToGbp={fxUsdToGbp}
              gradeProfile={gradeProfile}
              isTargeted={targetedIds.includes(card.id)}
              key={card.id}
              onLoadSoldComps={onLoadSoldComps}
              onToggleTargeted={onToggleTargeted}
              sold={soldComps[card.id]}
            />
          ))}
          {!cards.length && !loading && (
            <p className="empty-state">
              {isTargetedView ? "No cards saved yet. Add targets from the Crown watchlist." : "No cards match this search."}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function CrownCardRow({
  card,
  fxUsdToGbp,
  gradeProfile,
  isTargeted,
  onLoadSoldComps,
  onToggleTargeted,
  sold
}: {
  card: CrownZenithCard;
  fxUsdToGbp: number;
  gradeProfile: GradeProfile;
  isTargeted: boolean;
  onLoadSoldComps: (card: CrownZenithCard) => void;
  onToggleTargeted: (card: CrownZenithCard) => void;
  sold?: SoldComps;
}) {
  const tcgMarket = getTcgMarket(card);
  const cardmarket = card.cardmarket?.prices?.averageSellPrice;
  const margin = getUsUkMargin(sold, fxUsdToGbp);
  const query = buildCardQuery(card.name, gradeProfile);

  return (
    <article className="crown-card">
      <div className="crown-card-main">
        <div className="crown-thumb">
          {card.images?.small ? <img alt={card.name} src={card.images.small} /> : <span>{card.number}</span>}
        </div>
        <div>
          <strong>{card.name}</strong>
          <small>
            #{card.number} / {card.rarity ?? "Unknown rarity"}
          </small>
          <div className="pill-row compact">
            <span>{gradeProfile}</span>
            <span>TCGPlayer {tcgMarket ? formatCurrency(tcgMarket, "USD") : "n/a"}</span>
            <span>Cardmarket {cardmarket ? formatCurrency(cardmarket, "EUR") : "n/a"}</span>
          </div>
        </div>
      </div>

      <div className="market-actions">
        <div className="comp-summary">
          <strong>US avg</strong>
          <span>{formatSoldAverage(sold?.US)}</span>
        </div>
        <div className="comp-summary">
          <strong>UK avg</strong>
          <span>{formatSoldAverage(sold?.UK)}</span>
        </div>
        <div className={margin && margin.value >= 0 ? "comp-summary margin-positive" : "comp-summary"}>
          <strong>Margin</strong>
          <span>{margin ? `${formatMoney(margin.value)} / ${formatPercent(margin.percent)}` : "Load comps"}</span>
        </div>
        <a href={ebaySearchUrl(query, "US")} rel="noreferrer" target="_blank">
          US active <ExternalLink size={14} />
        </a>
        <a href={ebaySearchUrl(query, "UK")} rel="noreferrer" target="_blank">
          UK active <ExternalLink size={14} />
        </a>
        <a href={ebaySoldUrl(query, "US")} rel="noreferrer" target="_blank">
          US sold <ExternalLink size={14} />
        </a>
        <a href={ebaySoldUrl(query, "UK")} rel="noreferrer" target="_blank">
          UK sold <ExternalLink size={14} />
        </a>
        <button className={isTargeted ? "target-button saved" : "target-button"} onClick={() => onToggleTargeted(card)} type="button">
          {isTargeted ? "Saved" : "Target"}
        </button>
        <button disabled={sold?.loading} onClick={() => onLoadSoldComps(card)} type="button">
          {sold?.loading ? <Loader2 size={14} /> : <RefreshCcw size={14} />}
          Get last 3
        </button>
      </div>

      {sold && !sold.loading && (
        <div className="sold-comps">
          <SoldCompsPanel market="US" sold={sold.US} />
          <SoldCompsPanel market="UK" sold={sold.UK} />
        </div>
      )}
    </article>
  );
}

function SoldCompsPanel({ market, sold }: { market: EbayMarket; sold?: EbaySoldResponse }) {
  if (!sold) {
    return (
      <div className="sold-panel">
        <strong>{market} sold comps</strong>
        <small>Comps have not loaded yet.</small>
      </div>
    );
  }

  return (
    <div className="sold-panel">
      <strong>
        {market} avg: {sold.average ? formatCurrency(sold.average, sold.currency) : "n/a"}
      </strong>
      {sold.sales.length > 0 ? (
        sold.sales.map((sale) => (
          <a href={sale.url} key={sale.url} rel="noreferrer" target="_blank">
            {formatCurrency(sale.price, sale.currency)} <span>{sale.title}</span>
          </a>
        ))
      ) : (
        <a href={sold.sourceUrl} rel="noreferrer" target="_blank">
          View sold results on eBay <ExternalLink size={13} />
        </a>
      )}
      {sold.warning && <small>{sold.warning}</small>}
    </div>
  );
}

function getTcgMarket(card: CrownZenithCard) {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  for (const price of Object.values(prices)) {
    if (typeof price.market === "number") return price.market;
  }

  return null;
}

function buildCardQuery(cardName: string, gradeProfile: GradeProfile) {
  return gradeProfile === "Raw" ? cardName : `${cardName} ${gradeProfile}`;
}

function getUsUkMargin(sold: SoldComps | undefined, fxUsdToGbp: number) {
  if (!sold?.US?.average || !sold.UK?.average) return null;

  const usAverageGbp = sold.US.average * fxUsdToGbp;
  const ukAverageGbp = sold.UK.average;
  const value = ukAverageGbp - usAverageGbp;
  const percent = usAverageGbp > 0 ? (value / usAverageGbp) * 100 : 0;

  return {
    percent,
    value
  };
}

function sortCards(
  cards: CrownZenithCard[],
  sortMode: SortMode,
  soldComps: Record<string, SoldComps>,
  fxUsdToGbp: number,
  gradeProfile: GradeProfile
) {
  const sorted = [...cards];

  sorted.sort((a, b) => {
    if (sortMode === "priceHigh") return getCardPriceEstimate(b) - getCardPriceEstimate(a);
    if (sortMode === "priceLow") return getCardPriceEstimate(a) - getCardPriceEstimate(b);
    if (sortMode === "biggestMargin") {
      const marginA = getUsUkMargin(soldComps[a.id], fxUsdToGbp)?.value ?? Number.NEGATIVE_INFINITY;
      const marginB = getUsUkMargin(soldComps[b.id], fxUsdToGbp)?.value ?? Number.NEGATIVE_INFINITY;
      return marginB - marginA;
    }
    if (sortMode === "gradeHigh") {
      const gradeBoost = getGradeScore(gradeProfile);
      return getCardPriceEstimate(b) * gradeBoost - getCardPriceEstimate(a) * gradeBoost;
    }

    return Number(a.number.replace(/\D/g, "")) - Number(b.number.replace(/\D/g, ""));
  });

  return sorted;
}

function getCardPriceEstimate(card: CrownZenithCard) {
  return getTcgMarket(card) ?? card.cardmarket?.prices?.averageSellPrice ?? 0;
}

function getGradeScore(gradeProfile: GradeProfile) {
  if (gradeProfile.endsWith("10")) return 10;
  if (gradeProfile.endsWith("9")) return 9;
  return 0;
}

function formatCurrency(value: number, currency: "GBP" | "USD" | "EUR") {
  return new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "en-US", {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

function formatSoldAverage(sold?: EbaySoldResponse) {
  if (!sold) return "Not checked";
  return sold.average ? formatCurrency(sold.average, sold.currency) : "Check sold link";
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
        <h2>Modeled opportunities</h2>
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
        {!opportunities.length && <p className="empty-state">No signals meet the current filters.</p>}
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
          <Metric icon={Target} label="Entry price" value={formatMoney(opportunity.buyPriceGbp)} detail={opportunity.buyMarket.marketplace} />
          <Metric icon={TrendingUp} label="Exit value" value={formatMoney(opportunity.sellPriceGbp)} detail={opportunity.sellMarket.marketplace} />
          <Metric icon={Gauge} label="Projected profit" value={formatMoney(opportunity.netProfitGbp)} detail={formatPercent(opportunity.roiPct)} />
        </div>
        <div className="timeline">
          <div>
            <strong>US comp</strong>
            <span>{opportunity.buyMarket.soldDate} by {opportunity.buyMarket.seller}</span>
          </div>
          <div>
            <strong>UK comp</strong>
            <span>{opportunity.sellMarket.soldDate} by {opportunity.sellMarket.seller}</span>
          </div>
          <div>
            <strong>Signal</strong>
            <span>{formatPercent(opportunity.spreadPct)} market spread with {opportunity.confidence}/100 confidence</span>
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
        <h2>Live listing radar</h2>
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
  const [pushStatus, setPushStatus] = useState("Not enabled");
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionPayload | null>(null);
  const alertRules = [
    "New spread clears 20% ROI",
    "Watched card drops below target entry",
    "Auction is ending with positive margin",
    "Portfolio resale spread widens by 10%"
  ];

  async function enablePushAlerts() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("This browser does not support push alerts.");
      return;
    }

    setPushStatus("Requesting permission...");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setPushStatus("Notification permission was not enabled.");
      return;
    }

    const keyResponse = await fetch("/api/push/vapid-public-key");
    const { publicKey } = (await keyResponse.json()) as { publicKey: string | null };

    if (!publicKey) {
      setPushStatus("Push keys are missing. Add VAPID keys in Vercel.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey),
        userVisibleOnly: true
      }));

    const subscriptionPayload = subscription.toJSON() as PushSubscriptionPayload;

    await fetch("/api/push/subscribe", {
      body: JSON.stringify(subscriptionPayload),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    setPushSubscription(subscriptionPayload);
    setPushStatus("Enabled. This device can receive trading alerts.");
  }

  async function sendTestPush() {
    setPushStatus("Sending test push...");
    const response = await fetch("/api/push/test", {
      body: JSON.stringify({
        body: selected
          ? `${selected.cardName}: ${formatMoney(selected.netProfitGbp)} estimated profit, ${formatPercent(selected.roiPct)} ROI.`
          : "Push alerts are enabled for ArbiCards signals.",
        subscription: pushSubscription,
        title: "ArbiCards trading signal",
        url: "/"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const result = (await response.json()) as { error?: string; ok?: boolean; sent?: number };

    setPushStatus(result.ok ? `Test sent to ${result.sent ?? 1} device.` : result.error ?? "Test push was not delivered.");
  }

  return (
    <div>
      <div className="section-title">
        <Bell size={18} />
        <h2>Signal alerts</h2>
      </div>
      <div className="alert-layout">
        <article className="telegram-panel">
          <Bot size={26} />
          <h3>Telegram delivery</h3>
          <p>Send priority spreads straight to your trading chat the moment they clear your rules.</p>
          <code>POST /api/alerts/telegram</code>
          <button type="button">Send test alert</button>
        </article>
        <article className="telegram-panel">
          <Bell size={26} />
          <h3>Phone notifications</h3>
          <p>Install the app and enable push alerts to get time-sensitive signals in your status bar.</p>
          <code>POST /api/push/test</code>
          <div className="button-stack">
            <button onClick={enablePushAlerts} type="button">Enable push alerts</button>
            <button disabled={!pushSubscription} onClick={sendTestPush} type="button">Send test push</button>
          </div>
          <small>{pushStatus}</small>
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
          <strong>Current watch rule</strong>
          <span>
            {selected.cardName}: notify when ROI holds above {Math.max(20, Math.round(selected.roiPct))}% or US landed cost falls below{" "}
            {formatMoney(selected.landedCostGbp * 0.94)}.
          </span>
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function PortfolioPanel({ portfolioCost, portfolioValue }: { portfolioCost: number; portfolioValue: number }) {
  return (
    <>
      <div className="section-title">
        <BriefcaseBusiness size={18} />
        <h2>Holdings and PnL</h2>
      </div>
      <section className="portfolio-summary">
        <Metric icon={BriefcaseBusiness} label="Cost basis" value={formatMoney(portfolioCost)} detail="Tracked entries" />
        <Metric icon={TrendingUp} label="Resale value" value={formatMoney(portfolioValue)} detail="Current estimate" />
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
