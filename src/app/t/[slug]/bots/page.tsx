import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BotManager from "@/components/BotManager";

export default async function BotsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const [bots, customEndpoints] = await Promise.all([
    prisma.chatbot.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customEndpoint.findMany({
      where: { teamId: team.id },
      select: { provider: true, models: true },
    }),
  ]);

  const customModels: { id: string; label: string }[] = [];
  for (const endpoint of customEndpoints) {
    const models = endpoint.models ? JSON.parse(endpoint.models) : [];
    for (const model of models) {
      customModels.push({ id: model, label: model });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Chatbots</h1>
      <p className="mt-1 text-sm text-slate-400">
        Custom chatbots met eigen systeem-prompt en model. Selecteer ze in de chat.
      </p>
      <div className="mt-8">
        <BotManager
          teamSlug={slug}
          customModels={customModels}
          bots={bots.map((b: any) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            model: b.model,
            shared: b.shared || false,
          }))}
        />
      </div>
    </main>
  );
}
