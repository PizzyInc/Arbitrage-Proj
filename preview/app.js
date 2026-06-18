const rawListings = [
  ["Giratina VSTAR", "Crown Zenith", "Secret Rare", "PSA 10", "US", 154, "USD", 42, "https://images.pokemontcg.io/swsh12pt5/GG69_hires.png"],
  ["Giratina VSTAR", "Crown Zenith", "Secret Rare", "PSA 10", "UK", 178, "GBP", 31, "https://images.pokemontcg.io/swsh12pt5/GG69_hires.png"],
  ["Mewtwo VSTAR", "Crown Zenith", "Alt Art", "Raw NM", "US", 63, "USD", 88, "https://images.pokemontcg.io/swsh12pt5/GG44_hires.png"],
  ["Mewtwo VSTAR", "Crown Zenith", "Alt Art", "Raw NM", "UK", 67, "GBP", 75, "https://images.pokemontcg.io/swsh12pt5/GG44_hires.png"],
  ["Charizard ex", "Obsidian Flames", "Full Art", "PSA 9", "US", 94, "USD", 54, "https://images.pokemontcg.io/sv3/223_hires.png"],
  ["Charizard ex", "Obsidian Flames", "Full Art", "PSA 9", "UK", 101, "GBP", 39, "https://images.pokemontcg.io/sv3/223_hires.png"],
  ["Pikachu with Grey Felt Hat", "Pokemon x Van Gogh", "Promo", "Raw NM", "US", 118, "USD", 63, "https://images.pokemontcg.io/svp/SV085_hires.png"],
  ["Pikachu with Grey Felt Hat", "Pokemon x Van Gogh", "Promo", "Raw NM", "UK", 119, "GBP", 58, "https://images.pokemontcg.io/svp/SV085_hires.png"],
  ["Umbreon VMAX", "Evolving Skies", "Alt Art", "PSA 10", "US", 1640, "USD", 19, "https://images.pokemontcg.io/swsh7/215_hires.png"],
  ["Umbreon VMAX", "Evolving Skies", "Alt Art", "PSA 10", "UK", 1545, "GBP", 13, "https://images.pokemontcg.io/swsh7/215_hires.png"]
];
const listings = rawListings.map(([cardName, set, rarity, condition, region, price, currency, volume, image], index) => ({ id: `${region}-${index}`, cardName, set, rarity, condition, region, price, currency, volume, image }));
const marketListings = [["Courtyard", "Giratina VSTAR", "PSA 10", 132, 178, "Buy now", "Under market by 26%"], ["CollectorsCrypt", "Mewtwo VSTAR", "Raw NM", 48, 67, "14m 22s", "Snipe candidate"], ["Beezie", "Charizard ex", "PSA 9", 78, 101, "2h 05m", "Bid if ROI > 25%"]];
const portfolio = [["Mewtwo VSTAR", 52, 67, "Listed"], ["Pikachu with Grey Felt Hat", 101, 119, "Holding"], ["Charizard ex", 82, 101, "Ready to sell"]];
let currentTab = "feed";
let selectedId = "";
const money = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
const pct = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const byId = (id) => document.getElementById(id);
function settings() { return { fx: Number(byId("fx").value), fee: Number(byId("fee").value), shipping: Number(byId("shipping").value), duty: Number(byId("duty").value) }; }
function opportunities() {
  const s = settings();
  const groups = {};
  listings.forEach((item) => { const key = `${item.cardName}-${item.condition}`; groups[key] = groups[key] || []; groups[key].push(item); });
  return Object.values(groups).map((group) => {
    const us = group.find((item) => item.region === "US");
    const uk = group.find((item) => item.region === "UK");
    const buy = us.price * s.fx;
    const sell = uk.price;
    const landed = buy + s.shipping + buy * (s.duty / 100);
    const profit = sell - sell * (s.fee / 100) - landed;
    const roi = (profit / landed) * 100;
    const spread = ((sell - buy) / buy) * 100;
    const liquidity = Math.min(us.volume, uk.volume);
    return { ...us, id: `${us.id}-${uk.id}`, buy, sell, landed, profit, roi, spread, liquidity, confidence: Math.min(96, Math.round(52 + liquidity * 0.45 + Math.max(0, roi) * 0.72)) };
  }).sort((a, b) => b.profit - a.profit);
}
function filtered() {
  const set = byId("setFilter").value;
  const rarity = byId("rarityFilter").value;
  return opportunities().filter((item) => (set === "All sets" || item.set === set) && (rarity === "All rarity" || item.rarity === rarity) && item.roi >= Number(byId("minRoi").value) && item.sell <= Number(byId("maxPrice").value) && item.liquidity >= Number(byId("minVolume").value));
}
function selected() { const items = opportunities(); return items.find((item) => item.id === selectedId) || filtered()[0] || items[0]; }
function render() {
  ["minRoi", "maxPrice", "minVolume"].forEach((id) => { byId(`${id}Value`).textContent = byId(id).value; });
  const items = filtered();
  byId("profitMetric").textContent = money(items.reduce((sum, item) => sum + Math.max(0, item.profit), 0));
  byId("roiMetric").textContent = pct(items.reduce((sum, item) => sum + item.roi, 0) / Math.max(1, items.length));
  byId("countMetric").textContent = String(items.length);
  if (currentTab === "feed") renderFeed(items);
  if (currentTab === "detail") renderDetail(selected());
  if (currentTab === "listings") renderListings();
  if (currentTab === "alerts") renderAlerts(selected());
  if (currentTab === "portfolio") renderPortfolio();
}
function renderFeed(items) {
  byId("panel").innerHTML = `<h2>Opportunity feed</h2><div class="table"><table><thead><tr><th>Card</th><th>Buy</th><th>Sell</th><th>Profit</th><th>ROI</th><th>Confidence</th></tr></thead><tbody>${items.map((item) => `<tr data-id="${item.id}"><td><strong>${item.cardName}</strong><small>${item.set} / ${item.condition}</small></td><td><strong>${money(item.landed)}</strong><small>eBay US</small></td><td><strong>${money(item.sell)}</strong><small>eBay UK</small></td><td class="${item.profit > 0 ? "good" : "bad"}">${money(item.profit)}</td><td>${pct(item.roi)}</td><td><span class="pill">${item.confidence}</span></td></tr>`).join("")}</tbody></table></div>`;
  document.querySelectorAll("tbody tr").forEach((row) => row.addEventListener("click", () => { selectedId = row.dataset.id; currentTab = "detail"; syncTabs(); render(); }));
}
function renderDetail(item) {
  byId("panel").innerHTML = `<div class="detail"><div class="card"><img src="${item.image}" alt="${item.cardName}" /></div><section><p>${item.set}</p><h2>${item.cardName}</h2><div class="pills"><span>${item.rarity}</span><span>${item.condition}</span><span>${item.liquidity} sales / 30d</span></div><div class="metrics mini"><article><span>Buy market</span><strong>${money(item.buy)}</strong><small>eBay US</small></article><article><span>Sell market</span><strong>${money(item.sell)}</strong><small>eBay UK</small></article><article><span>Net profit</span><strong>${money(item.profit)}</strong><small>${pct(item.roi)}</small></article></div><div class="watch"><strong>Signal</strong><span>${pct(item.spread)} regional spread with ${item.confidence}/100 confidence.</span></div></section></div>`;
}
function renderListings() {
  byId("panel").innerHTML = `<h2>Marketplace listings</h2><div class="cards">${marketListings.map(([platform, card, condition, ask, value, time, signal]) => `<article><span>${platform}</span><h3>${card}</h3><small>${condition}</small><strong>${money(ask)}</strong><small>Market ${money(value)}</small><p>${time}</p><button>${signal}</button></article>`).join("")}</div>`;
}
function renderAlerts(item) {
  byId("panel").innerHTML = `<h2>Alerts dashboard</h2><div class="alertgrid"><article class="telegram"><h3>Telegram bot</h3><p>Connect a bot token and chat ID on the host to send high-signal alerts into your workflow.</p><code>POST /api/alerts/telegram</code><button>Send test alert</button></article><section class="rules">${["New arbitrage opportunity over 20% ROI", "Watched card drops below target buy price", "Auction ending soon with positive spread", "Portfolio spread widens by 10%"].map((rule, i) => `<label><input type="checkbox" ${i < 3 ? "checked" : ""}/>${rule}</label>`).join("")}</section></div><div class="watch"><strong>Current watch target</strong><span>${item.cardName}: alert when ROI stays above ${Math.max(20, Math.round(item.roi))}%.</span></div>`;
}
function renderPortfolio() {
  const cost = portfolio.reduce((sum, item) => sum + item[1], 0);
  const value = portfolio.reduce((sum, item) => sum + item[2], 0);
  byId("panel").innerHTML = `<h2>Portfolio / PnL</h2><section class="metrics mini"><article><span>Inventory cost</span><strong>${money(cost)}</strong><small>Tracked purchases</small></article><article><span>Market value</span><strong>${money(value)}</strong><small>Estimated resale</small></article><article><span>Unrealized PnL</span><strong>${money(value - cost)}</strong><small>${pct(((value - cost) / cost) * 100)}</small></article></section><div class="portfolio">${portfolio.map(([card, c, v, status]) => `<article><strong>${card}</strong><span>${status}</span><strong>${money(v - c)}</strong></article>`).join("")}</div>`;
}
function syncTabs() { document.querySelectorAll("nav button").forEach((button) => button.classList.toggle("active", button.dataset.tab === currentTab)); }
function init() {
  byId("setFilter").innerHTML = ["All sets", ...new Set(listings.map((item) => item.set))].map((item) => `<option>${item}</option>`).join("");
  byId("rarityFilter").innerHTML = ["All rarity", ...new Set(listings.map((item) => item.rarity))].map((item) => `<option>${item}</option>`).join("");
  document.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", render));
  document.querySelectorAll("nav button").forEach((button) => button.addEventListener("click", () => { currentTab = button.dataset.tab; syncTabs(); render(); }));
  byId("refresh").addEventListener("click", () => { byId("refreshMetric").textContent = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()); });
  render();
}
init();
