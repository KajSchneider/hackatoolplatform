import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const projects = await prisma.project.findMany({
    where: { group: { teamId: team.id } },
    include: { files: true, gitHubConnections: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { name, description, groupId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const group = await prisma.group.findFirst({
    where: { id: groupId, teamId: team.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const slugValue = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const project = await prisma.project.create({
    data: {
      name,
      slug: slugValue,
      description,
      groupId: group.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
