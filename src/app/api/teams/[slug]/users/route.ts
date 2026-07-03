import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Team owner/admin: create users and add them to their team
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: { memberships: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membership = team.memberships.find(m => m.userId === session.user.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Geen toestemming om users toe te voegen" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email en wachtwoord zijn verplicht" }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new user
    const passwordHash = password; // In production, hash this!
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        role: "user",
      },
    });
    userId = newUser.id;
  }

  // Check if user is already in team
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId: team.id } },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "User is al lid van dit team" }, { status: 400 });
  }

  // Add user to team
  await prisma.membership.create({
    data: {
      userId,
      teamId: team.id,
      role: role || "member",
    },
  });

  return NextResponse.json({ userId, email });
}

// Team owner/admin: list team members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: { memberships: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membership = team.memberships.find(m => m.userId === session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Geen toegang tot dit team" }, { status: 403 });
  }

  const members = await prisma.membership.findMany({
    where: { teamId: team.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}
