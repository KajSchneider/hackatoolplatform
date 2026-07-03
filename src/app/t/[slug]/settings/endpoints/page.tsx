import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EndpointManager from "@/components/EndpointManager";

export default async function EndpointsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const endpoints = await prisma.customEndpoint.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Custom AI Endpoints</h1>
      <p className="mt-1 text-sm text-slate-400">
        Configureer eigen AI API endpoints (OpenAI-compatible, Anthropic-compatible, of custom).
        Deze endpoints worden gebruikt als alternatief voor BYOK keys.
      </p>
      <div className="mt-8">
        <EndpointManager
          teamSlug={slug}
          endpoints={endpoints.map((e: any) => ({
            id: e.id,
            name: e.name,
            provider: e.provider,
            baseUrl: e.baseUrl,
            apiKey: e.apiKey ? `***${e.apiKey.slice(-4)}` : null,
            models: e.models ? JSON.parse(e.models) : [],
            createdAt: e.createdAt,
          }))}
        />
      </div>
    </main>
  );
}
