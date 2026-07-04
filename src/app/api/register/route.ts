import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "E-mailadres is al in gebruik" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  // De eerste geregistreerde gebruiker wordt automatisch platform admin.
  const userCount = await prisma.user.count();
  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: userCount === 0 ? "admin" : "user",
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
