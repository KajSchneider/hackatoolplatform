import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { saveFile, MAX_FILE_SIZE } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { slug } = await params;
  const ctx = await requireMembership(session.user.id, slug);
  if (!ctx) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Bestand te groot (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const relPath = await saveFile(ctx.team.id, buffer);
  const stored = await prisma.storedFile.create({
    data: {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      path: relPath,
      teamId: ctx.team.id,
      userId: session.user.id,
    },
  });
  return NextResponse.json({ id: stored.id }, { status: 201 });
}
