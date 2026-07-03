import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { encrypt } from "@/lib/crypto";

const schema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  key: z.string().min(10).max(500),
  label: z.string().max(100).optional(),
});

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
  const { provider, key, label } = parsed.data;
  const encryptedKey = encrypt(key);
  await prisma.apiKey.upsert({
    where: { teamId_provider: { teamId: team.id, provider } },
    create: { teamId: team.id, provider, encryptedKey, label },
    update: { encryptedKey, label },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
