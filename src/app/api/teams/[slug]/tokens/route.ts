import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { generateToken } from "@/lib/tokens";

const schema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { token, prefix, tokenHash } = generateToken();
  await prisma.platformToken.create({
    data: { name: parsed.data.name, prefix, tokenHash, teamId: team.id },
  });
  return NextResponse.json({ token }, { status: 201 });
}
