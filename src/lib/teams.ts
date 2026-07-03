import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "team"
  );
}

export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.team.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export async function requireMembership(teamId: string) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Platform admins have access to all teams
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role === "admin") {
    return session;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  return session;
}

export async function requirePlatformAdmin() {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Platform admin required" }, { status: 403 });
  }

  return session;
}

export async function requireTeamAdmin(teamId: string) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: Team admin required" }, { status: 403 });
  }

  return session;
}

export function isTeamActive(team: { startDate: Date | null; endDate: Date | null }): boolean {
  const now = new Date();
  
  if (!team.startDate && !team.endDate) {
    return true; // No dates set, always active
  }
  
  if (team.startDate && now < team.startDate) {
    return false; // Before start date
  }
  
  if (team.endDate && now > team.endDate) {
    return false; // After end date
  }
  
  return true;
}
