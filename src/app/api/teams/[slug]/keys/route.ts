import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { encrypt } from "@/lib/crypto";

const schema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  key: z.string().min(10).max(500),
  label: z.string().max(100).optional(),
});

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
  const { provider, key, label } = parsed.data;
  const encryptedKey = encrypt(key);
  await prisma.apiKey.upsert({
    where: { teamId_provider: { teamId: ctx.team.id, provider } },
    create: { teamId: ctx.team.id, provider, encryptedKey, label },
    update: { encryptedKey, label },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
