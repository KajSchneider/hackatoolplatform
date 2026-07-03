import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await req.json();
  const { shared } = body;

  const updated = await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      shared: shared !== undefined ? shared : workflow.shared,
    },
  });

  return NextResponse.json(updated);
}
