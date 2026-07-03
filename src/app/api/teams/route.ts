import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/teams";

const schema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Alleen platform beheerders kunnen hackathons aanmaken" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const slug = await uniqueSlug(parsed.data.name);
  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      slug,
      memberships: { create: { userId: session.user.id, role: "owner" } },
    },
  });
  return NextResponse.json({ id: team.id, slug: team.slug }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { teamId, name, startDate, endDate } = body;

  if (!teamId || !name) {
    return NextResponse.json({ error: "teamId en name zijn verplicht" }, { status: 400 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: { memberships: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membership = team.memberships.find(m => m.userId === session.user.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Geen toestemming om team te bewerken" }, { status: 403 });
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { 
      name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return NextResponse.json(updated);
}
