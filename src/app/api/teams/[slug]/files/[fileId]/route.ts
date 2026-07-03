import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { readStoredFile, deleteStoredFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { slug, fileId } = await params;
  const ctx = await requireMembership(session.user.id, slug);
  if (!ctx) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const file = await prisma.storedFile.findFirst({
    where: { id: fileId, teamId: ctx.team.id },
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { slug, fileId } = await params;
  const ctx = await requireMembership(session.user.id, slug);
  if (!ctx) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const file = await prisma.storedFile.findFirst({
    where: { id: fileId, teamId: ctx.team.id },
  });
  if (file) {
    await deleteStoredFile(file.path);
    await prisma.storedFile.delete({ where: { id: file.id } });
  }
  return NextResponse.json({ ok: true });
}
