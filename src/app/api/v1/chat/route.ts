import { generateText, streamText, type CoreMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { resolveAiModel, consumeCredit, logUsage } from "@/lib/ai";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Authorization: Bearer <token> vereist" }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  const tokenHash = hashToken(token);

  // Rate limit: 100 requests per minute per token
  const rateLimit = checkRateLimit(`api:${tokenHash}`, 100, 60000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
        },
      }
    );
  }

  const platformToken = await prisma.platformToken.findUnique({
    where: { tokenHash },
    include: { team: true },
  });
  if (!platformToken) {
    return Response.json({ error: "Ongeldig token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    model?: string;
    messages?: CoreMessage[];
    stream?: boolean;
  } | null;
  if (!body?.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "Body vereist: { model, messages: [{role, content}], stream? }" },
      { status: 400 }
    );
  }

  const team = platformToken.team;
  const resolved = await resolveAiModel(team, body.model);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }

  await prisma.platformToken.update({
    where: { id: platformToken.id },
    data: { lastUsedAt: new Date() },
  });
  if (resolved.usingPlatformKey) {
    await consumeCredit(team.id);
  }

  if (body.stream) {
    const result = streamText({
      model: resolved.aiModel,
      messages: body.messages,
      async onFinish({ usage }) {
        await logUsage(team.id, "api", body.model!, usage);
      },
    });
    return result.toDataStreamResponse();
  }

  const result = await generateText({ model: resolved.aiModel, messages: body.messages });
  await logUsage(team.id, "api", body.model, result.usage);
  return Response.json({
    model: body.model,
    content: result.text,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    },
  });
}
