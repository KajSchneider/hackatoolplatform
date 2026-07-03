import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { readStoredFile, deleteStoredFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  const { slug, fileId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  const file = await prisma.storedFile.findFirst({
    where: { id: fileId, teamId: team.id },
  });
  if (!file) {
    return NextResponse.json({ error: "Bestand niet gevonden" }, { status: 404 });
  }
  const data = await readStoredFile(file.path);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  const { slug, fileId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  const file = await prisma.storedFile.findFirst({
    where: { id: fileId, teamId: team.id },
  });
  if (file) {
    await deleteStoredFile(file.path);
    await prisma.storedFile.delete({ where: { id: file.id } });
  }
  return NextResponse.json({ ok: true });
}
