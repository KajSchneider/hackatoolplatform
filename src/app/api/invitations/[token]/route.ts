import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  return NextResponse.json({
    teamName: invitation.team.name,
    teamSlug: invitation.team.slug,
    role: invitation.role,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  // Check if email matches
  if (session.user.email !== invitation.email) {
    return NextResponse.json({ error: "Email does not match invitation" }, { status: 403 });
  }

  // Create membership
  await prisma.membership.create({
    data: {
      userId: session.user.id,
      teamId: invitation.teamId,
      role: invitation.role,
    },
  });

  // Mark invitation as accepted
  await prisma.teamInvitation.update({
    where: { id: invitation.id },
    data: { accepted: true },
  });

  return NextResponse.json({ success: true, teamSlug: invitation.teamId });
}
