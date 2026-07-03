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

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const files = await prisma.projectFile.findMany({
    where: { projectId: project.id },
    orderBy: { path: "asc" },
  });

  return NextResponse.json(files);
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

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const { path, content, folderId } = body;

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  const file = await prisma.projectFile.upsert({
    where: { projectId_path: { projectId: project.id, path } },
    update: { content, folderId },
    create: { path, content: content || "", projectId: project.id, folderId },
  });

  return NextResponse.json(file, { status: 201 });
}
