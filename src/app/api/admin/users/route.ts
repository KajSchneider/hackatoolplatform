import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Platform admin: create users and add them to teams/groups
export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { email, name, password, teamId, groupId } = body;

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

  // If teamId provided, add user to team
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
    }

    // Check if user is already in team
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId,
          teamId,
          role: "member",
        },
      });
    }
  }

  // If groupId provided, add user to group
  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group niet gevonden" }, { status: 404 });
    }

    // Check if user is already in group
    const existingGroupMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!existingGroupMembership) {
      await prisma.groupMembership.create({
        data: {
          userId,
          groupId,
          role: "member",
        },
      });
    }
  }

  return NextResponse.json({ userId, email });
}

// Platform admin: list all users
export async function GET(req: NextRequest) {
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

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      memberships: {
        select: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          role: true,
        },
      },
      groupMemberships: {
        select: {
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
