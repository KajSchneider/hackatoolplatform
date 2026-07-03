import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { MessageSquare, KeyRound, LayoutDashboard, FolderOpen, Bot, KeySquare, Code2, Workflow, Users, Plus, Server } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TeamName from "@/components/TeamName";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import Logo from "@/components/Logo";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      groups: {
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!team) notFound();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) notFound();

  return (
    <div className="flex min-h-screen bg-white dark:bg-brand-700">
      <CollapsibleSidebar title={team.name}>
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent-500 dark:text-slate-400 dark:hover:text-white">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
        <Logo size="sm" showText={false} className="mt-4 mb-2" />
        <TeamName teamId={team.id} teamSlug={team.slug} name={team.name} credits={team.credits} startDate={team.startDate?.toISOString()} endDate={team.endDate?.toISOString()} />
        <nav className="mt-6 space-y-1">
          <Link
            href={`/t/${slug}/groups`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <Users className="h-4 w-4" />
            Groups
          </Link>
          <Link
            href={`/t/${slug}/settings/endpoints`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <Bot className="h-4 w-4" />
            AI Endpoints
          </Link>
          <Link
            href={`/t/${slug}/settings/mcp-servers`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <Server className="h-4 w-4" />
            MCP Servers
          </Link>
        </nav>
        <div className="mt-6">
          <h3 className="mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-500">Groups</h3>
          <div className="space-y-1">
            {team.groups.map((group) => (
              <Link
                key={group.id}
                href={`/t/${slug}/groups/${group.slug}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
              >
                <Users className="h-4 w-4" />
                <span className="flex-1 truncate">{group.name}</span>
                <span className="text-xs text-gray-500">{group.memberships.length}</span>
              </Link>
            ))}
            {team.groups.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-500">
                No groups yet
              </div>
            )}
          </div>
        </div>
      </CollapsibleSidebar>
      <div className="min-w-0 flex-1 bg-white dark:bg-brand-700">{children}</div>
    </div>
  );
}
