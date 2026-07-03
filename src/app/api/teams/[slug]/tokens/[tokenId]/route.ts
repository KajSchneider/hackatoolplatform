import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; tokenId: string }> }
) {
  const { slug, tokenId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  await prisma.platformToken.deleteMany({ where: { id: tokenId, teamId: team.id } });
  return NextResponse.json({ ok: true });
}
