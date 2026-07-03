import { prisma } from "./prisma";

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "admin";
}

export async function requireAdmin(userId: string): Promise<boolean | Response> {
  const admin = await isAdmin(userId);
  if (!admin) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }
  return true;
}
