import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { MAX_DEPLOYMENTS_PER_USER } from "@/lib/deployments";
import { pushToGitHub, enableGitHubPages } from "@/lib/github";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; groupSlug: string; projectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { slug, groupSlug, projectId } = await params;

  // Get project and team
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membershipCheck = await requireMembership(team.id);
  if (membershipCheck instanceof Response) {
    return membershipCheck;
  }

  // Check deployment limit (max 25 per user)
  const deploymentCount = await prisma.deployment.count({
    where: { createdById: session.user.id },
  });

  if (deploymentCount >= MAX_DEPLOYMENTS_PER_USER) {
    return NextResponse.json(
      { error: `Max ${MAX_DEPLOYMENTS_PER_USER} deployments bereikt` },
      { status: 400 }
    );
  }

  const group = await prisma.group.findFirst({
    where: { slug: groupSlug, teamId: team.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group niet gevonden" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId, groupId: group.id },
    include: {
      files: true,
      gitHubConnections: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  // Require a GitHub connection
  const gitHubConnection = project.gitHubConnections[0];
  if (!gitHubConnection) {
    return NextResponse.json(
      { error: "Koppel eerst een GitHub repository via de GitHub knop" },
      { status: 400 }
    );
  }

  if (project.files.length === 0) {
    return NextResponse.json(
      { error: "Project heeft geen bestanden om te deployen" },
      { status: 400 }
    );
  }

  // Create deployment record
  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      createdById: session.user.id,
      status: "deploying",
    },
  });

  try {
    // Push files to GitHub
    const { commitSha, commitUrl } = await pushToGitHub(
      gitHubConnection,
      project.files.map((f) => ({ path: f.path, content: f.content }))
    );

    // Enable GitHub Pages on the repo (uses the connected branch as source)
    const pagesUrl = await enableGitHubPages(gitHubConnection);

    // Update deployment record
    const updatedDeployment = await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "deployed",
        url: pagesUrl,
        commitSha,
      },
    });

    return NextResponse.json({
      ...updatedDeployment,
      commitUrl,
      message: "Code gepusht naar GitHub. GitHub Pages is ingeschakeld.",
    });
  } catch (error) {
    console.error("Deployment error:", error);
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed" },
    });
    const message = error instanceof Error ? error.message : "Deployment mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; groupSlug: string; projectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { slug, groupSlug, projectId } = await params;

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

  const deployments = await prisma.deployment.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deployments);
}
