import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/teams";

// Platform admin: list all teams (hackathons)
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

  const teams = await prisma.team.findMany({
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      groups: {
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(teams);
}

// Platform admin: create a new hackathon with a designated beheerder
export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { name, beheerderId, startDate, endDate } = body;

  if (!name) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  if (!beheerderId) {
    return NextResponse.json({ error: "Beheerder is verplicht" }, { status: 400 });
  }

  // Verify the beheerder exists
  const beheerder = await prisma.user.findUnique({
    where: { id: beheerderId },
  });

  if (!beheerder) {
    return NextResponse.json({ error: "Beheerder niet gevonden" }, { status: 404 });
  }

  const slug = await uniqueSlug(name);

  const team = await prisma.team.create({
    data: {
      name,
      slug,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      memberships: {
        create: { userId: beheerderId, role: "owner" },
      },
    },
    include: {
      memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  return NextResponse.json(team, { status: 201 });
}
