import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; folderId: string }> }
) {
  const { slug, projectId, folderId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Check if folder exists and belongs to project
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, projectId },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: { name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; folderId: string }> }
) {
  const { slug, projectId, folderId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  // Check if folder exists and belongs to project
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, projectId },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Delete folder (cascade will delete children and files)
  await prisma.folder.delete({
    where: { id: folderId },
  });

  return NextResponse.json({ success: true });
}
