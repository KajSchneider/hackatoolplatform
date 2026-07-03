import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: workflow.id },
    orderBy: { order: "asc" },
    include: { chatbot: { select: { id: true, name: true } } },
  });

  return NextResponse.json(steps.map(s => ({ ...s, config: JSON.parse(s.config) })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await req.json();
  const { type, config, order, chatbotId } = body;

  if (!type || !config || order === undefined) {
    return NextResponse.json({ error: "Type, config, and order are required" }, { status: 400 });
  }

  const step = await prisma.workflowStep.create({
    data: {
      type,
      config: JSON.stringify(config),
      order,
      workflowId: workflow.id,
      chatbotId: chatbotId || null,
    },
  });

  return NextResponse.json({ ...step, config: JSON.parse(step.config) }, { status: 201 });
}
