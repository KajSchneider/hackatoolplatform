import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string; stepId: string }> }
) {
  const { slug, workflowId, stepId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, workflowId: workflow.id },
  });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const body = await req.json();
  const { type, config, chatbotId } = body;

  const updated = await prisma.workflowStep.update({
    where: { id: stepId },
    data: {
      type: type ?? step.type,
      config: config !== undefined ? JSON.stringify(config) : step.config,
      chatbotId: chatbotId !== undefined ? chatbotId : step.chatbotId,
    },
  });

  return NextResponse.json({ ...updated, config: JSON.parse(updated.config) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string; stepId: string }> }
) {
  const { slug, workflowId, stepId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, workflowId: workflow.id },
  });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  await prisma.workflowStep.delete({ where: { id: stepId } });

  return NextResponse.json({ success: true });
}
