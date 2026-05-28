import { NextResponse } from "next/server";

const CROWN_ZENITH_QUERY = new URLSearchParams({
  orderBy: "number",
  pageSize: "250",
  q: "set.id:swsh12pt5",
  select: "id,name,number,rarity,images,tcgplayer,cardmarket"
});

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
