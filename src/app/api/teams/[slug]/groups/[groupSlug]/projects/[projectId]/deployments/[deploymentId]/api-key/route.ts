import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { generateDeployKey } from "@/lib/deployments";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; groupSlug: string; projectId: string; deploymentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { slug, groupSlug, projectId, deploymentId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membershipCheck = await requireMembership(team.id);
  if (membershipCheck instanceof Response) {
    return membershipCheck;
  }

  const group = await prisma.group.findFirst({
    where: { slug: groupSlug, teamId: team.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group niet gevonden" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId, groupId: group.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId, projectId: project.id },
  });

  if (!deployment) {
    return NextResponse.json({ error: "Deployment niet gevonden" }, { status: 404 });
  }

  if (deployment.publicApiKey) {
    return NextResponse.json({ error: "Deployment already has a public API key" }, { status: 400 });
  }

  try {
    const { token, tokenHash } = generateDeployKey();

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { publicApiKey: tokenHash },
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("API key generation error:", error);
    return NextResponse.json({ error: "API key generation failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; groupSlug: string; projectId: string; deploymentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { slug, groupSlug, projectId, deploymentId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membershipCheck = await requireMembership(team.id);
  if (membershipCheck instanceof Response) {
    return membershipCheck;
  }

  const group = await prisma.group.findFirst({
    where: { slug: groupSlug, teamId: team.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group niet gevonden" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId, groupId: group.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId, projectId: project.id },
  });

  if (!deployment) {
    return NextResponse.json({ error: "Deployment niet gevonden" }, { status: 404 });
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { publicApiKey: null },
  });

  return NextResponse.json({ success: true });
}
