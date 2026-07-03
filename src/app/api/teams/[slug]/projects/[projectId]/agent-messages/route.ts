import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const messages = await prisma.agentMessage.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { role, content } = body as { role: string; content: string };

  if (!role || !content) {
    return NextResponse.json({ error: "role en content zijn verplicht" }, { status: 400 });
  }

  const message = await prisma.agentMessage.create({
    data: { projectId: project.id, role, content },
  });

  return NextResponse.json({ id: message.id, role: message.role, content: message.content });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  await prisma.agentMessage.deleteMany({ where: { projectId: project.id } });

  return NextResponse.json({ ok: true });
}
