import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { saveFile, MAX_FILE_SIZE } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof Response) return session;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Bestand te groot (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const relPath = await saveFile(team.id, buffer);
  const stored = await prisma.storedFile.create({
    data: {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      path: relPath,
      teamId: team.id,
      userId: session.user.id,
    },
  });
  return NextResponse.json({ id: stored.id }, { status: 201 });
}
