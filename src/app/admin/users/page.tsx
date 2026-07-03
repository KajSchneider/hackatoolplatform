import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserManagement from "@/components/UserManagement";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      memberships: {
        select: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold">User Management</h1>
        <UserManagement users={users} teams={teams} />
      </div>
    </div>
  );
}
