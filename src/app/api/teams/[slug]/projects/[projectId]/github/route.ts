import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { encrypt, decrypt } from "@/lib/crypto";

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
    include: { gitHubConnections: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Mask access tokens in response
  const connections = project.gitHubConnections.map((conn: any) => ({
    ...conn,
    accessToken: "***",
  }));

  return NextResponse.json(connections);
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
  const { owner, repo, branch, accessToken } = body;

  if (!owner || !repo || !accessToken) {
    return NextResponse.json(
      { error: "Owner, repo, and accessToken are required" },
      { status: 400 }
    );
  }

  const encryptedToken = encrypt(accessToken);

  const connection = await prisma.gitHubConnection.create({
    data: {
      owner,
      repo,
      branch: branch || "main",
      accessToken: encryptedToken,
      projectId: project.id,
    },
  });

  return NextResponse.json(
    { ...connection, accessToken: "***" },
    { status: 201 }
  );
}
