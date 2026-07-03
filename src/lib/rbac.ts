import { prisma } from "@/lib/prisma";

export async function hasRole(userId: string, teamId: string, role: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!membership) return false;

  if (role === "owner") return membership.role === "owner";
  if (role === "admin") return membership.role === "owner" || membership.role === "admin";
  if (role === "member") return true; // all members have member access

  return false;
}

export async function requireRole(userId: string, teamId: string, role: string): Promise<boolean> {
  return hasRole(userId, teamId, role);
}
