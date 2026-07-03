import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import McpServerManager from "@/components/McpServerManager";

export default async function McpServersPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const servers = await prisma.mcpServer.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">MCP Servers</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
        Configureer Model Context Protocol servers om de AI agent uit te breiden met externe tools en data.
        Ondersteunt SSE (remote) en stdio (local) transports.
      </p>
      <div className="mt-8">
        <McpServerManager
          teamSlug={slug}
          servers={servers.map((s) => ({
            id: s.id,
            name: s.name,
            transportType: s.transportType,
            url: s.url,
            command: s.command,
            args: s.args,
            env: s.env,
            headers: s.headers,
            enabled: s.enabled,
            createdAt: s.createdAt,
          }))}
        />
      </div>
    </main>
  );
}
