import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || id.length !== 11) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ duration: null });
    }

    const html = await res.text();
    const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
    if (approxMatch) {
      const seconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
      return NextResponse.json({ duration: seconds });
    }

    const isoMatch = html.match(/itemprop="duration" content="PT(?:(\d+)M)?(?:(\d+)S)?"/);
    if (isoMatch) {
      const mins = parseInt(isoMatch[1] || "0", 10);
      const secs = parseInt(isoMatch[2] || "0", 10);
      return NextResponse.json({ duration: mins * 60 + secs });
    }

    return NextResponse.json({ duration: null });
  } catch (err) {
    console.error("YouTube duration fetch failed:", err);
    return NextResponse.json({ duration: null });
  }
}
