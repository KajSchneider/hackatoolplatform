import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TeamUserManagement from "@/components/TeamUserManagement";

export default async function TeamUsersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;

  const team = await prisma.team.findUnique({
    where: { slug },
    include: { memberships: true },
  });

  if (!team) redirect("/dashboard");

  const membership = team.memberships.find(m => m.userId === session.user.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    redirect(`/t/${slug}`);
  }

  const members = await prisma.membership.findMany({
    where: { teamId: team.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">{team.name} - Teamleden</h1>
        <TeamUserManagement teamId={team.id} teamSlug={slug} members={members} />
      </div>
    </div>
  );
}
