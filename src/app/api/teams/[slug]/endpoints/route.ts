import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const endpoints = await prisma.customEndpoint.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  // Mask API keys
  return NextResponse.json(
    endpoints.map((e: any) => ({
      ...e,
      apiKey: e.apiKey ? `***${e.apiKey.slice(-4)}` : null,
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const body = await req.json();
  const { name, provider, baseUrl, apiKey, models } = body;

  if (!name || !provider || !baseUrl) {
    return NextResponse.json(
      { error: "Name, provider, and baseUrl are required" },
      { status: 400 }
    );
  }

  const encryptedKey = apiKey ? encrypt(apiKey) : null;

  const endpoint = await prisma.customEndpoint.create({
    data: {
      name,
      provider,
      baseUrl,
      apiKey: encryptedKey ?? "",
      models: models ? JSON.stringify(models) : "[]",
      team: { connect: { id: team.id } },
    },
  });

  return NextResponse.json(
    {
      ...endpoint,
      apiKey: endpoint.apiKey ? `***${endpoint.apiKey.slice(-4)}` : null,
    },
    { status: 201 }
  );
}
