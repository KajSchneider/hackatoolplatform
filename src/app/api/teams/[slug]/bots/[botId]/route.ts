import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string; botId: string }> }
) {
  const { slug, botId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { shared } = body;

  const updated = await prisma.chatbot.update({
    where: { id: botId, teamId: team.id },
    data: { shared },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; botId: string }> }
) {
  const { slug, botId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  await prisma.chatbot.deleteMany({ where: { id: botId, teamId: team.id } });
  return NextResponse.json({ ok: true });
}
