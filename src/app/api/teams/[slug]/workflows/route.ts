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

  const workflows = await prisma.workflow.findMany({
    where: { teamId: team.id },
    include: { steps: { orderBy: { order: "asc" } }, runs: { orderBy: { createdAt: "desc" }, take: 10 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workflows);
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
  const { name, description, schedule } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      schedule,
      teamId: team.id,
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
