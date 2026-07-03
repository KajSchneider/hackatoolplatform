import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChatLayout from "@/components/chat/ChatLayout";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug, id } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const conversation = await prisma.conversation.findFirst({
    where: { id, teamId: team.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  const [conversations, bots, customEndpoints] = await Promise.all([
    prisma.conversation.findMany({
      where: { teamId: team.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.chatbot.findMany({
      where: { teamId: team.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customEndpoint.findMany({
      where: { teamId: team.id },
      select: { id: true, provider: true, models: true },
    }),
  ]);

  // Collect all custom endpoint models
  const customModels: { id: string; label: string; provider: string }[] = [];
  for (const endpoint of customEndpoints) {
    const models = endpoint.models ? JSON.parse(endpoint.models) : [];
    for (const model of models) {
      customModels.push({
        id: model,
        label: model,
        provider: endpoint.provider,
      });
    }
  }

  return (
    <ChatLayout
      teamSlug={slug}
      conversations={conversations}
      bots={bots}
      customModels={customModels}
      conversationId={conversation.id}
      initialModel={conversation.model}
      initialChatbotId={conversation.chatbotId ?? undefined}
      initialMessages={conversation.messages.map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))}
    />
  );
}
