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
  SlidersHorizontal,
  Check,
  ChevronDown,
  Bookmark,
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
  subset: "base" | "galarian-gallery";
  subsetLabel: "Base Set" | "Galarian Gallery";
  setTotal: number;
  rarity?: string;
  images?: { small?: string; large?: string };
  tcgplayer?: { prices?: Record<string, { market?: number; mid?: number }> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
};

type CrownMetadata = {
  complete: boolean;
  expectedTotal: number;
  rarities: string[];
  series: string;
  set: string;
  subsets: Array<{ id: "base" | "galarian-gallery"; label: string; total: number }>;
  total: number;
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

const crownZenithSubsets = [{ id: "all", label: "All cards", total: 230 }, { id: "base", label: "Base Set", total: 160 }, { id: "galarian-gallery", label: "Galarian Gallery", total: 70 }] as const;
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
  const [crownMetadata, setCrownMetadata] = useState<CrownMetadata | null>(null);
  const [soldComps, setSoldComps] = useState<Record<string, SoldComps>>({});
  const [gradeProfile, setGradeProfile] = useState<GradeProfile>("Raw");
  const [sortMode, setSortMode] = useState<SortMode>("number");
  const [targetedIds, setTargetedIds] = useState<string[]>([]);
  const [subsetFilter, setSubsetFilter] = useState<"all" | "base" | "galarian-gallery">("all");
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [rarityMenuOpen, setRarityMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minRoi, setMinRoi] = useState(10);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minVolume, setMinVolume] = useState(10);
  const [settings, setSettings] = useState(defaultCostSettings);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const opportunities = useMemo(() => buildOpportunities(settings), [settings]);
  const filtered = opportunities.filter((opportunity) => {
    const setMatch = opportunity.set === "Crown Zenith";
    const rarityMatch = selectedRarities.length === 0 || selectedRarities.includes(opportunity.rarity);
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
  const filterCard = (card: CrownZenithCard) => {
    const nameMatch = card.name.toLowerCase().includes(cardSearch.trim().toLowerCase());
    const subsetMatch = subsetFilter === "all" || card.subset === subsetFilter;
    const rarityMatch = selectedRarities.length === 0 || (card.rarity ? selectedRarities.includes(card.rarity) : false);
    return nameMatch && subsetMatch && rarityMatch;
  };
  const searchedCrownCards = useMemo(
    () => sortCards(crownCards.filter(filterCard), sortMode, soldComps, settings.fxUsdToGbp, gradeProfile),
    [cardSearch, crownCards, gradeProfile, selectedRarities, settings.fxUsdToGbp, soldComps, sortMode, subsetFilter]
  );
  const targetedCards = useMemo(
    () => sortCards(crownCards.filter((card) => targetedIds.includes(card.id) && filterCard(card)), sortMode, soldComps, settings.fxUsdToGbp, gradeProfile),
    [cardSearch, crownCards, gradeProfile, selectedRarities, settings.fxUsdToGbp, soldComps, sortMode, subsetFilter, targetedIds]
  );
  useEffect(() => {
    let mounted = true;

    fetch("/api/cards/crown-zenith")
      .then((response) => {
        if (!response.ok) throw new Error(`Card API returned ${response.status}`);
        return response.json() as Promise<{ data: CrownZenithCard[]; error?: string; metadata?: CrownMetadata }>;
      })
      .then((payload) => {
        if (!mounted) return;
        if (payload.error) throw new Error(payload.error);
        setCrownCards(payload.data ?? []);
        setCrownMetadata(payload.metadata ?? null);
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
    window.location.reload();
  }

  return (
    <main className="app-shell">
      <header className="mobile-app-header">
        <button className="icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" type="button">
          <Menu size={21} />
        </button>
        <div className="mobile-brand">
          <span className="brand-mark">A</span>
          <div><strong>ArbiCards</strong><small>Crown Zenith</small></div>
        </div>
        <button className="icon-button" onClick={refreshData} aria-label="Sync market data" type="button">
          <RefreshCcw size={19} />
        </button>
      </header>

      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark">A</span>
            <div><strong>ArbiCards</strong><small>Card market intelligence</small></div>
          </div>
          <button className="sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" type="button"><X size={20} /></button>
        </div>
        <nav className="nav-list" aria-label="Dashboard sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={activeTab === tab.id ? "nav-item active" : "nav-item"} key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }} type="button">
                <Icon size={18} /><span>{tab.label}</span>
                {tab.id === "targeted" && targetedIds.length > 0 && <b>{targetedIds.length}</b>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-panel">
          <span className="panel-label">Crown Zenith checklist</span>
          <div className="checklist-mini"><strong>{crownMetadata?.total ?? crownCards.length}/230</strong><span>cards loaded</span></div>
          <div className="checklist-bar"><i style={{ width: `${Math.min(100, ((crownMetadata?.total ?? crownCards.length) / 230) * 100)}%` }} /></div>
          <small>160 Base Set + 70 Galarian Gallery</small>
        </div>
      </aside>

      <button className={`sidebar-overlay ${mobileMenuOpen ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)} aria-label="Close menu overlay" type="button" />

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sword & Shield series</p>
            <h1>Crown Zenith market workspace</h1>
            <p className="topbar-subtitle">Compare prices, track the full 230-card checklist, and save targets.</p>
          </div>
          <button className="primary-button" onClick={refreshData} type="button"><RefreshCcw size={16} /><span>Sync</span></button>
        </header>

        <section className="metric-grid compact-metrics" aria-label="Crown Zenith summary">
          <Metric icon={Check} label="Checklist" value={`${crownMetadata?.total ?? crownCards.length}/230`} detail={crownMetadata?.complete ? "Complete set loaded" : "Loading set data"} />
          <Metric icon={Search} label="Base Set" value={String(crownCards.filter((card) => card.subset === "base").length)} detail="of 160 cards" />
          <Metric icon={TrendingUp} label="Galarian Gallery" value={String(crownCards.filter((card) => card.subset === "galarian-gallery").length)} detail="of 70 cards" />
          <Metric icon={Bookmark} label="Targeted" value={String(targetedIds.length)} detail="saved cards" />
        </section>

        <section className="main-panel">
          {(activeTab === "crown" || activeTab === "targeted") && (
            <CrownZenithBrowser
              cards={activeTab === "targeted" ? targetedCards : searchedCrownCards}
              error={crownError}
              filtersOpen={filtersOpen}
              fxUsdToGbp={settings.fxUsdToGbp}
              gradeProfile={gradeProfile}
              isTargetedView={activeTab === "targeted"}
              loading={crownLoading}
              metadata={crownMetadata}
              onGradeProfileChange={setGradeProfile}
              onLoadVisibleSoldComps={loadVisibleSoldComps}
              onLoadSoldComps={loadSoldComps}
              onRarityMenuChange={setRarityMenuOpen}
              onSearch={setCardSearch}
              onSelectedRaritiesChange={setSelectedRarities}
              onSortModeChange={setSortMode}
              onSubsetChange={setSubsetFilter}
              onToggleFilters={() => setFiltersOpen((value) => !value)}
              onToggleTargeted={toggleTargeted}
              rarityMenuOpen={rarityMenuOpen}
              search={cardSearch}
              selectedRarities={selectedRarities}
              soldComps={soldComps}
              sortMode={sortMode}
              subsetFilter={subsetFilter}
              targetedIds={targetedIds}
              totalCards={activeTab === "targeted" ? targetedIds.length : crownCards.length}
            />
          )}
          {activeTab === "feed" && <OpportunityFeed opportunities={filtered} selected={selected} onSelect={(opportunity) => { setSelectedId(opportunity.id); setActiveTab("detail"); }} />}
          {activeTab === "detail" && (selected ? <CardDetail opportunity={selected} /> : <EmptyPanel title="No card selected" body="Open an opportunity from the Feed to see its detail." />)}
          {activeTab === "marketplaces" && <MarketplaceListings />}
          {activeTab === "alerts" && <AlertsDashboard selected={selected} />}
          {activeTab === "portfolio" && <PortfolioPanel portfolioCost={portfolioCost} portfolioValue={portfolioValue} />}
        </section>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {tabs.filter((tab) => ["crown", "targeted", "alerts", "portfolio"].includes(tab.id)).map((tab) => {
          const Icon = tab.icon;
          return <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button"><Icon size={19} /><span>{tab.label}</span>{tab.id === "targeted" && targetedIds.length > 0 && <b>{targetedIds.length}</b>}</button>;
        })}
      </nav>
    </main>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <div className="empty-panel"><Target size={22} /><strong>{title}</strong><p>{body}</p></div>;
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
  cards, error, filtersOpen, fxUsdToGbp, gradeProfile, isTargetedView, loading, metadata,
  onGradeProfileChange, onLoadVisibleSoldComps, onLoadSoldComps, onRarityMenuChange, onSearch,
  onSelectedRaritiesChange, onSortModeChange, onSubsetChange, onToggleFilters, onToggleTargeted,
  rarityMenuOpen, search, selectedRarities, soldComps, sortMode, subsetFilter, targetedIds, totalCards
}: {
  cards: CrownZenithCard[]; error: string; filtersOpen: boolean; fxUsdToGbp: number;
  gradeProfile: GradeProfile; isTargetedView: boolean; loading: boolean; metadata: CrownMetadata | null;
  onGradeProfileChange: (value: GradeProfile) => void; onLoadVisibleSoldComps: () => void;
  onLoadSoldComps: (card: CrownZenithCard) => void; onRarityMenuChange: (open: boolean) => void;
  onSearch: (value: string) => void; onSelectedRaritiesChange: (values: string[]) => void;
  onSortModeChange: (value: SortMode) => void;
  onSubsetChange: (value: "all" | "base" | "galarian-gallery") => void;
  onToggleFilters: () => void; onToggleTargeted: (card: CrownZenithCard) => void;
  rarityMenuOpen: boolean; search: string; selectedRarities: string[];
  soldComps: Record<string, SoldComps>; sortMode: SortMode;
  subsetFilter: "all" | "base" | "galarian-gallery"; targetedIds: string[]; totalCards: number;
}) {
  const rarityOptions = metadata?.rarities ?? [];
  return (
    <div className="browser-view">
      <div className="browser-heading">
        <div><p className="eyebrow">{isTargetedView ? "Saved watchlist" : "Complete set checklist"}</p><h2>{isTargetedView ? "Targeted cards" : "Crown Zenith"}</h2><small>{loading ? "Loading cards..." : `${cards.length} shown � ${totalCards} total`}</small></div>
        <button className={filtersOpen ? "filter-button active" : "filter-button"} onClick={onToggleFilters} type="button"><SlidersHorizontal size={16} /><span>Filters</span>{selectedRarities.length > 0 && <b>{selectedRarities.length}</b>}</button>
      </div>

      <div className="search-toolbar">
        <label className="search-field" aria-label="Search Crown Zenith cards"><Search size={18} /><input placeholder="Search by card name or number" type="search" value={search} onChange={(event) => onSearch(event.target.value)} /></label>
        <button className="secondary-button comps-button" disabled={loading || cards.length === 0} onClick={onLoadVisibleSoldComps} type="button"><RefreshCcw size={15} /><span>Load prices</span></button>
      </div>

      {!isTargetedView && <div className="subset-tabs" role="tablist" aria-label="Crown Zenith subsets">
        {crownZenithSubsets.map((subset) => <button className={subsetFilter === subset.id ? "active" : ""} key={subset.id} onClick={() => onSubsetChange(subset.id)} type="button"><span>{subset.label}</span><b>{subset.total}</b></button>)}
      </div>}

      <div className={filtersOpen ? "filter-panel open" : "filter-panel"}>
        <label><span>Grade</span><select value={gradeProfile} onChange={(event) => onGradeProfileChange(event.target.value as GradeProfile)}>{gradeProfiles.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
        <label><span>Sort</span><select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <RarityMultiSelect open={rarityMenuOpen} options={rarityOptions} selected={selectedRarities} onOpenChange={onRarityMenuChange} onChange={onSelectedRaritiesChange} />
      </div>

      {!isTargetedView && <div className="set-status"><div><Check size={16} /><strong>{metadata?.total ?? totalCards}/230 cards loaded</strong></div><span>160 Base Set � 70 Galarian Gallery � final Sword & Shield expansion</span></div>}
      {selectedRarities.length > 0 && <div className="active-filters"><span>Rarity:</span>{selectedRarities.map((rarity) => <button key={rarity} onClick={() => onSelectedRaritiesChange(selectedRarities.filter((item) => item !== rarity))} type="button">{rarity}<X size={12} /></button>)}<button onClick={() => onSelectedRaritiesChange([])} type="button">Clear all</button></div>}

      {error && <div className="error-state"><strong>Card data unavailable</strong><span>{error}</span></div>}
      {loading && <div className="loading-state"><Loader2 size={18} /><span>Loading the complete Crown Zenith checklist...</span></div>}
      {!loading && !error && <div className="crown-grid">
        {cards.map((card) => <CrownCardRow card={card} fxUsdToGbp={fxUsdToGbp} gradeProfile={gradeProfile} isTargeted={targetedIds.includes(card.id)} key={card.id} onLoadSoldComps={onLoadSoldComps} onToggleTargeted={onToggleTargeted} sold={soldComps[card.id]} />)}
        {!cards.length && <div className="empty-panel"><Search size={22} /><strong>{isTargetedView ? "No matching targets" : "No cards found"}</strong><p>{isTargetedView ? "Save cards from Crown or adjust your filters." : "Try a different search, subset, or rarity."}</p></div>}
      </div>}
    </div>
  );
}

function RarityMultiSelect({ open, options, selected, onOpenChange, onChange }: { open: boolean; options: string[]; selected: string[]; onOpenChange: (open: boolean) => void; onChange: (values: string[]) => void }) {
  const toggle = (rarity: string) => onChange(selected.includes(rarity) ? selected.filter((item) => item !== rarity) : [...selected, rarity]);
  return <div className="multi-select"><span>Rarity</span><button className="multi-select-trigger" onClick={() => onOpenChange(!open)} type="button"><span>{selected.length === 0 ? "All rarities" : `${selected.length} selected`}</span><ChevronDown size={15} /></button>{open && <div className="multi-select-menu">
    <button className="select-all" onClick={() => onChange([])} type="button"><span className={selected.length === 0 ? "checkbox checked" : "checkbox"}>{selected.length === 0 && <Check size={12} />}</span>All rarities</button>
    {options.map((rarity) => <button key={rarity} onClick={() => toggle(rarity)} type="button"><span className={selected.includes(rarity) ? "checkbox checked" : "checkbox"}>{selected.includes(rarity) && <Check size={12} />}</span>{rarity}</button>)}
  </div>}</div>;
}

function CrownCardRow({ card, fxUsdToGbp, gradeProfile, isTargeted, onLoadSoldComps, onToggleTargeted, sold }: { card: CrownZenithCard; fxUsdToGbp: number; gradeProfile: GradeProfile; isTargeted: boolean; onLoadSoldComps: (card: CrownZenithCard) => void; onToggleTargeted: (card: CrownZenithCard) => void; sold?: SoldComps }) {
  const tcgMarket = getTcgMarket(card);
  const cardmarket = card.cardmarket?.prices?.averageSellPrice ?? card.cardmarket?.prices?.trendPrice;
  const margin = getUsUkMargin(sold, fxUsdToGbp);
  const query = buildCardQuery(card.name, gradeProfile);
  return <article className="crown-card">
    <div className="crown-card-main">
      <div className="crown-thumb">{card.images?.small ? <img alt={`${card.name} card`} loading="lazy" src={card.images.small} /> : <span>{card.number}</span>}</div>
      <div className="card-identity"><div className="card-title-row"><div><strong>{card.name}</strong><small>{card.subsetLabel} � #{card.number}/{card.setTotal}</small></div><button className={isTargeted ? "save-button saved" : "save-button"} onClick={() => onToggleTargeted(card)} aria-label={isTargeted ? "Remove from Targeted" : "Save to Targeted"} type="button"><Bookmark size={17} fill={isTargeted ? "currentColor" : "none"} /></button></div>
        <div className="card-tags"><span>{card.rarity ?? "Unknown rarity"}</span>{gradeProfile !== "Raw" && <span>{gradeProfile}</span>}</div>
        <div className="reference-prices"><div><small>TCGPlayer</small><strong>{tcgMarket ? formatCurrency(tcgMarket, "USD") : "�"}</strong></div><div><small>Cardmarket</small><strong>{cardmarket ? formatCurrency(cardmarket, "EUR") : "�"}</strong></div></div>
      </div>
    </div>
    <div className="comp-grid"><div><small>US market</small><strong>{formatSoldAverage(sold?.US)}</strong></div><div><small>UK market</small><strong>{formatSoldAverage(sold?.UK)}</strong></div><div className={margin && margin.value >= 0 ? "positive" : ""}><small>UK margin</small><strong>{margin ? `${formatMoney(margin.value)} � ${formatPercent(margin.percent)}` : "Load prices"}</strong></div></div>
    <div className="card-primary-actions"><button className="load-card-prices" disabled={sold?.loading} onClick={() => onLoadSoldComps(card)} type="button">{sold?.loading ? <Loader2 size={15} /> : <RefreshCcw size={15} />}<span>{sold?.loading ? "Checking..." : "Check market"}</span></button><a href={ebaySearchUrl(query, "UK")} rel="noreferrer" target="_blank">UK listings<ExternalLink size={14} /></a></div>
    <details className="research-details"><summary>More eBay research <ChevronDown size={15} /></summary><div className="research-links"><a href={ebaySearchUrl(query, "US")} rel="noreferrer" target="_blank">US active<ExternalLink size={13} /></a><a href={ebaySearchUrl(query, "UK")} rel="noreferrer" target="_blank">UK active<ExternalLink size={13} /></a><a href={ebaySoldUrl(query, "US")} rel="noreferrer" target="_blank">US sold<ExternalLink size={13} /></a><a href={ebaySoldUrl(query, "UK")} rel="noreferrer" target="_blank">UK sold<ExternalLink size={13} /></a></div>{sold && !sold.loading && <div className="sold-comps"><SoldCompsPanel market="US" sold={sold.US} /><SoldCompsPanel market="UK" sold={sold.UK} /></div>}</details>
  </article>;
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
