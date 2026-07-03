import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Add user to group
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { groupId, role } = body;

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is verplicht" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    return NextResponse.json({ error: "Group niet gevonden" }, { status: 404 });
  }

  const membership = await prisma.groupMembership.create({
    data: {
      userId,
      groupId,
      role: role || "member",
    },
  });

  return NextResponse.json(membership);
}

// Remove user from group
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Geen admin rechten" }, { status: 403 });
  }

  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is verplicht" }, { status: 400 });
  }

  await prisma.groupMembership.deleteMany({
    where: { userId, groupId },
  });

  return NextResponse.json({ success: true });
}
