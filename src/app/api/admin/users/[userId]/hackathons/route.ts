import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Add user to hackathon
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { teamId, role } = body;

  if (!teamId) {
    return NextResponse.json({ error: "Team ID is verplicht" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return NextResponse.json({ error: "Hackathon niet gevonden" }, { status: 404 });
  }

  const membership = await prisma.membership.create({
    data: {
      userId,
      teamId,
      role: role || "member",
    },
  });

  return NextResponse.json(membership);
}

// Remove user from hackathon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "Team ID is verplicht" }, { status: 400 });
  }

  await prisma.membership.deleteMany({
    where: { userId, teamId },
  });

  return NextResponse.json({ success: true });
}
