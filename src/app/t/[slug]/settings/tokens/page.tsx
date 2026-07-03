import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TokenManager from "@/components/TokenManager";

export default async function TokensPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const tokens = await prisma.platformToken.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">API Tokens</h1>
      <p className="mt-1 text-sm text-slate-400">
        Tokens voor de Hackatool REST API. Roep <code className="text-accent-500">POST /api/v1/chat</code> aan
        met <code className="text-accent-500">Authorization: Bearer &lt;token&gt;</code>.
      </p>
      <div className="mt-8">
        <TokenManager
          teamSlug={slug}
          tokens={tokens.map((t: any) => ({
            id: t.id,
            name: t.name,
            prefix: t.prefix,
            createdAt: t.createdAt,
            lastUsedAt: t.lastUsedAt,
          }))}
        />
      </div>
      <div className="card mt-8">
        <h2 className="font-semibold">Voorbeeld</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">
{`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1/chat \\
  -H "Authorization: Bearer hk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hallo!"}]}'`}
        </pre>
      </div>
    </main>
  );
}
