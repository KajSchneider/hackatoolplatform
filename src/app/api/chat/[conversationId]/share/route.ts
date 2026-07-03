import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { conversationId } = await params;
  const body = await req.json();
  const { shared } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });
  }

  if (conversation.userId !== session.user.id) {
    return NextResponse.json({ error: "Geen toestemming om dit gesprek te delen" }, { status: 403 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { shared },
  });

  return NextResponse.json({ shared: updated.shared });
}
