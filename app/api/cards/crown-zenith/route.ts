import { NextResponse } from "next/server";

const CROWN_ZENITH_QUERY = new URLSearchParams({
  orderBy: "number",
  pageSize: "250",
  q: "set.id:swsh12pt5",
  select: "id,name,number,rarity,images,tcgplayer,cardmarket"
});

function determineSubset(card: any): string | undefined {
  // Crown Zenith: Base set is 1-160, Galarian Gallery is GG1-GG70
  const number = card.number || "";
  if (number.startsWith("GG") || number.startsWith("gg")) {
    return "GallarianGallery";
  } else if (!isNaN(parseInt(number)) && parseInt(number) <= 160) {
    return "BaseSet";
  }
  return undefined;
}

export async function GET() {
  try {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards?${CROWN_ZENITH_QUERY.toString()}`, {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 3600
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          data: [],
          error: `PokemonTCG API returned ${response.status}`
        },
        { status: 200 }
      );
    }

    const payload = await response.json();
    
    // Add subset information to each card
    if (Array.isArray(payload.data)) {
      payload.data = payload.data.map((card: any) => ({
        ...card,
        subset: determineSubset(card)
      }));
    }
    
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        data: [],
        error: "Could not fetch Crown Zenith cards."
      },
      { status: 200 }
    );
  }
}
