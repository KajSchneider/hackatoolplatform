import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChatLayout from "@/components/chat/ChatLayout";

export default async function ChatPage({ 
  params 
}: { 
  params: Promise<{ slug: string; groupSlug: string }> 
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug, groupSlug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) notFound();
  
  const group = await prisma.group.findUnique({
    where: { teamId_slug: { teamId: team.id, slug: groupSlug } },
  });
  if (!group) notFound();

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
  });
  if (!membership) notFound();

  const [conversations, bots, customEndpoints] = await Promise.all([
    prisma.conversation.findMany({
      where: { teamId: team.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, shared: true, userId: true },
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
      groupSlug={groupSlug}
      conversations={conversations} 
      bots={bots} 
      customModels={customModels}
      initialMessages={[]} 
      currentUserId={session.user.id}
    />
  );
}
