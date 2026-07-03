import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { MessageSquare, FolderOpen, Code2, Workflow, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ThemeToggle from "@/components/ThemeToggle";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug, groupSlug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) notFound();
  const group = await prisma.group.findUnique({
    where: { teamId_slug: { teamId: team.id, slug: groupSlug } },
    include: {
      team: true,
    },
  });
  if (!group) notFound();
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
  });
  if (!membership) notFound();

  return (
    <div className="flex min-h-screen bg-white dark:bg-brand-700">
      <CollapsibleSidebar title={group.name}>
        <div className="flex items-center justify-between">
          <Link href={`/t/${slug}/groups`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Back to Groups
          </Link>
          <ThemeToggle />
        </div>
        <div className="mt-4 px-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{group.name}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-500">{team.name}</p>
        </div>
        <nav className="mt-6 space-y-1">
          <Link
            href={`/t/${slug}/groups/${groupSlug}/chat`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Link>
          <Link
            href={`/t/${slug}/groups/${groupSlug}/files`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <FolderOpen className="h-4 w-4" />
            Bestanden
          </Link>
          <Link
            href={`/t/${slug}/groups/${groupSlug}/projects`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <Code2 className="h-4 w-4" />
            Projects
          </Link>
          <Link
            href={`/t/${slug}/groups/${groupSlug}/workflows`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-brand-500"
          >
            <Workflow className="h-4 w-4" />
            Workflows
          </Link>
        </nav>
      </CollapsibleSidebar>
      <div className="min-w-0 flex-1 bg-white dark:bg-brand-700">{children}</div>
    </div>
  );
}
