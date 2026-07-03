import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
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
  const { name, description, shared } = body;

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: name ?? project.name,
      description: description ?? project.description,
      shared: shared !== undefined ? shared : project.shared,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
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

  await prisma.projectFile.deleteMany({ where: { projectId } });
  await prisma.gitHubConnection.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });

  return NextResponse.json({ success: true });
}
