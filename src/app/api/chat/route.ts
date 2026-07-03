import { streamText, type CoreMessage } from "ai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { resolveAiModel, logUsage } from "@/lib/ai";
import { loadMcpTools } from "@/lib/mcp";
import { NextRequest, NextResponse } from "next/server";
import { isTeamActive } from "@/lib/teams";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { messages, teamSlug, model, conversationId, chatbotId } = (await req.json()) as {
    messages: CoreMessage[];
    teamSlug: string;
    model: string;
    conversationId?: string;
    chatbotId?: string;
  };

  const team = await prisma.team.findUnique({ where: { slug: teamSlug } });
  if (!team) {
    return Response.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  if (!isTeamActive(team)) {
    return Response.json({ error: "Hackathon is niet actief" }, { status: 403 });
  }

  // Rate limit: 60 requests per minute per user/team
  const rateLimit = checkRateLimit(`chat:${session.user.id}:${team.id}`, 60, 60000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { status: 429 }
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) {
    return Response.json({ error: "Geen toegang tot dit team" }, { status: 403 });
  }

  // Optional custom chatbot: system prompt + model override
  let systemPrompt: string | undefined;
  let effectiveModel = model;
  if (chatbotId) {
    const bot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, teamId: team.id },
    });
    if (bot) {
      systemPrompt = bot.systemPrompt;
      effectiveModel = bot.model;
    }
  }

  const resolved = await resolveAiModel(team, effectiveModel);
  if (!resolved.ok) {
    console.error("AI model resolution failed:", resolved.error, resolved.status);
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }

  // Ensure conversation exists and persist the user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const userText =
    typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage?.content ?? "");

  let convId: string;
  if (conversationId) {
    convId = conversationId;
  } else {
    const conversation = await prisma.conversation.create({
      data: {
        teamId: team.id,
        userId: session.user.id,
        model: effectiveModel,
        chatbotId: chatbotId ?? null,
        title: userText.slice(0, 60) || "Nieuw gesprek",
      },
    });
    convId = conversation.id;
  }

  await prisma.message.create({
    data: { conversationId: convId, role: "user", content: userText },
  });

  // Load MCP tools for this team
  const { tools: mcpTools, clients: mcpClients } = await loadMcpTools(team.id);
  const mcpToolNames = Object.keys(mcpTools);
  const mcpInfo = mcpToolNames.length > 0
    ? `\n\n## MCP TOOLS\nJe hebt toegang tot ${mcpToolNames.length} MCP tool(s): ${mcpToolNames.join(", ")}.\n\nBELANGRIJK: Roep deze tools DAADWERKELIJK aan via de tool calling interface. Simuleer NOOIT tool resultaten of verzinsel geen antwoorden.\n- Wanneer een vraag relevant is voor een beschikbare tool, roep de tool dan aan.\n- Toon de echte resultaten die de tool teruggeeft, inclusief links en URLs.\n- Als de tool geen resultaten vindt, zeg dat dan eerlijk.\n- Gebruik de tool resultaten om een goed antwoord te formuleren.`
    : "";

  try {
    const result = streamText({
      model: resolved.aiModel,
      system: (systemPrompt || "") + mcpInfo,
      tools: mcpToolNames.length > 0 ? mcpTools : undefined,
      maxSteps: mcpToolNames.length > 0 ? 5 : 1,
      messages,
      async onFinish({ text, usage }) {
        await prisma.message.create({
          data: { conversationId: convId, role: "assistant", content: text },
        });
        await prisma.conversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
        await logUsage(team.id, "chat", effectiveModel, usage);
      },
    });

    return result.toDataStreamResponse({
      headers: { "x-conversation-id": convId },
    });
  } finally {
    setTimeout(() => {
      mcpClients.forEach((c) => c.close().catch(() => {}));
    }, 5000);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const teamSlug = searchParams.get("teamSlug");

  if (!conversationId || !teamSlug) {
    return NextResponse.json({ error: "conversationId en teamSlug zijn verplicht" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { slug: teamSlug } });
  if (!team) {
    return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Geen toegang tot dit team" }, { status: 403 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, teamId: team.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });
  }

  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });

  return NextResponse.json({ success: true });
}
