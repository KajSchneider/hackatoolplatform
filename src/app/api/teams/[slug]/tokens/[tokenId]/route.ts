import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; tokenId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { slug, tokenId } = await params;
  const ctx = await requireMembership(session.user.id, slug);
  if (!ctx) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  await prisma.platformToken.deleteMany({ where: { id: tokenId, teamId: ctx.team.id } });
  return NextResponse.json({ ok: true });
}
