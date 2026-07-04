import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { requireMembership } from "@/lib/teams";

const BAZAARLINK_REGISTER_URL = "https://bazaarlink.ai/api/v1/agents/register";
const BAZAARLINK_BASE_URL = "https://bazaarlink.ai/api/v1";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => ({}));
  const agentName = body.name || `hackatool-${team.slug}`;

  try {
    const regRes = await fetch(BAZAARLINK_REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      body: JSON.stringify({ name: agentName }),
      signal: AbortSignal.timeout(15000),
    });

    if (!regRes.ok) {
      const err = await regRes.text().catch(() => "(geen body)");
      console.error("Bazaarlink registratie faalde:", regRes.status, err);
      return NextResponse.json(
        { error: `Bazaarlink registratie mislukt (HTTP ${regRes.status}): ${err}` },
        { status: 502 }
      );
    }

    const regData = await regRes.json();
    const { api_key, free_model, upgrade_url } = regData;

    if (!api_key) {
      return NextResponse.json(
        { error: "Bazaarlink gaf geen API key terug" },
        { status: 502 }
      );
    }

    const models = free_model ? [free_model] : ["auto:free"];

    const endpoint = await prisma.customEndpoint.create({
      data: {
        name: "Bazaarlink",
        provider: "openai",
        baseUrl: BAZAARLINK_BASE_URL,
        apiKey: encrypt(api_key),
        models: JSON.stringify(models),
        team: { connect: { id: team.id } },
      },
    });

    return NextResponse.json(
      {
        id: endpoint.id,
        name: endpoint.name,
        provider: endpoint.provider,
        baseUrl: endpoint.baseUrl,
        apiKey: `***${api_key.slice(-4)}`,
        models,
        upgradeUrl: upgrade_url || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bazaarlink register error:", error?.name, error?.message, error?.cause);
    return NextResponse.json(
      { error: `Kon niet verbinden met Bazaarlink: ${error?.message || "onbekende fout"}` },
      { status: 500 }
    );
  }
}
