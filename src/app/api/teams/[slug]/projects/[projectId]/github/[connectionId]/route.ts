import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; connectionId: string }> }
) {
  const { slug, projectId, connectionId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.gitHubConnection.delete({
    where: { id: connectionId, projectId: project.id },
  });

  return NextResponse.json({ success: true });
}
