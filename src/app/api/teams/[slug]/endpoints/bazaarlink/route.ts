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
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const agentName = body.name || `hackatool-${team.slug}`;

  try {
    const regRes = await fetch(BAZAARLINK_REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName }),
    });

    if (!regRes.ok) {
      const err = await regRes.text();
      return NextResponse.json(
        { error: `Bazaarlink registratie mislukt: ${err}` },
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
  } catch (error) {
    console.error("Bazaarlink register error:", error);
    return NextResponse.json(
      { error: "Kon niet verbinden met Bazaarlink" },
      { status: 500 }
    );
  }
}
