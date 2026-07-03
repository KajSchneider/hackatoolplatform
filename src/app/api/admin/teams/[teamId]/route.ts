import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Platform admin: update a hackathon
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { teamId } = await params;
  const body = await req.json();
  const { name, startDate, endDate } = body;

  if (!name) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Hackathon niet gevonden" }, { status: 404 });
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

// Platform admin: delete a hackathon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Hackathon niet gevonden" }, { status: 404 });
  }

  await prisma.team.delete({ where: { id: teamId } });

  return NextResponse.json({ ok: true });
}
