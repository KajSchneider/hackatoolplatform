import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const folders = await prisma.folder.findMany({
    where: { projectId },
    include: { children: true, files: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(folders);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { name, parentId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: {
      name,
      projectId,
      parentId: parentId || null,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
