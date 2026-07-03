import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamAdmin } from "@/lib/teams";
import { randomBytes } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireTeamAdmin(team.id);
  if (session instanceof NextResponse) return session;

  const invitations = await prisma.teamInvitation.findMany({
    where: { teamId: team.id, accepted: false },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireTeamAdmin(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { email, role = "member" } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if user already has membership
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: existingUser.id, teamId: team.id } },
    });
    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 });
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.teamInvitation.findUnique({
    where: { email_teamId: { email, teamId: team.id } },
  });
  if (existingInvitation && !existingInvitation.accepted) {
    return NextResponse.json({ error: "Invitation already pending" }, { status: 400 });
  }

  // Create invitation
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const invitation = await prisma.teamInvitation.create({
    data: {
      email,
      teamId: team.id,
      role,
      token,
      expiresAt,
    },
  });

  // TODO: Send email with invitation link
  // For now, return the token for testing
  return NextResponse.json(invitation, { status: 201 });
}
