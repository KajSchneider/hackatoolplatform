import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { generateToken } from "@/lib/tokens";

const schema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { slug } = await params;
  const ctx = await requireMembership(session.user.id, slug);
  if (!ctx) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { token, prefix, tokenHash } = generateToken();
  await prisma.platformToken.create({
    data: { name: parsed.data.name, prefix, tokenHash, teamId: ctx.team.id },
  });
  // Full token is returned exactly once
  return NextResponse.json({ token }, { status: 201 });
}
