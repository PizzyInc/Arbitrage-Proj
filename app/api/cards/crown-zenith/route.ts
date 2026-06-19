import { NextResponse } from "next/server";

type PokemonCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images?: { small?: string; large?: string };
  tcgplayer?: { prices?: Record<string, { market?: number; mid?: number }> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
};

type Subset = {
  id: "base" | "galarian-gallery";
  label: "Base Set" | "Galarian Gallery";
  setId: "swsh12pt5" | "swsh12pt5gg";
  total: number;
};

const SUBSETS: Subset[] = [
  { id: "base", label: "Base Set", setId: "swsh12pt5", total: 160 },
  { id: "galarian-gallery", label: "Galarian Gallery", setId: "swsh12pt5gg", total: 70 }
];

const SELECT_FIELDS = "id,name,number,rarity,images,tcgplayer,cardmarket";

async function fetchSubset(subset: Subset) {
  const params = new URLSearchParams({
    orderBy: "number",
    pageSize: "250",
    q: `set.id:${subset.setId}`,
    select: SELECT_FIELDS
  });
  const response = await fetch(`https://api.pokemontcg.io/v2/cards?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`${subset.label} returned ${response.status}`);
  }

  const payload = (await response.json()) as { data?: PokemonCard[] };
  return (payload.data ?? []).map((card) => ({
    ...card,
    setTotal: subset.total,
    subset: subset.id,
    subsetLabel: subset.label
  }));
}

export async function GET() {
  try {
    const groups = await Promise.all(SUBSETS.map(fetchSubset));
    const data = groups.flat();
    const rarityValues = [...new Set(data.map((card) => card.rarity).filter(Boolean))].sort();

    return NextResponse.json({
      data,
      metadata: {
        series: "Sword & Shield",
        set: "Crown Zenith",
        subsets: SUBSETS.map(({ id, label, total }) => ({ id, label, total })),
        total: data.length,
        expectedTotal: 230,
        complete: data.length === 230,
        rarities: rarityValues
      }
    });
  } catch (error) {
    return NextResponse.json({
      data: [],
      error: error instanceof Error ? error.message : "Could not fetch Crown Zenith cards.",
      metadata: { set: "Crown Zenith", total: 0, expectedTotal: 230, complete: false }
    });
  }
}
