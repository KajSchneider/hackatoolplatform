import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; endpointId: string }> }
) {
  const { slug, endpointId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const endpoint = await prisma.customEndpoint.findFirst({
    where: { id: endpointId, teamId: team.id },
  });
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, provider, baseUrl, apiKey, models } = body;

  // Only update apiKey if a new one is provided (non-empty string)
  const encryptedKey = apiKey && apiKey.trim() !== "" ? encrypt(apiKey) : endpoint.apiKey;

  const updated = await prisma.customEndpoint.update({
    where: { id: endpointId },
    data: {
      name: name ?? endpoint.name,
      provider: provider ?? endpoint.provider,
      baseUrl: baseUrl ?? endpoint.baseUrl,
      apiKey: encryptedKey,
      models: models ? JSON.stringify(models) : endpoint.models,
    },
  });

  return NextResponse.json({
    ...updated,
    apiKey: updated.apiKey ? `***${updated.apiKey.slice(-4)}` : null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; endpointId: string }> }
) {
  const { slug, endpointId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const endpoint = await prisma.customEndpoint.findFirst({
    where: { id: endpointId, teamId: team.id },
  });
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  await prisma.customEndpoint.delete({
    where: { id: endpointId },
  });

  return NextResponse.json({ success: true });
}
