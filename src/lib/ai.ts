import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

type TeamRef = { id: string; credits: number };

export type ResolveResult =
  | { ok: true; aiModel: LanguageModel; usingPlatformKey: boolean }
  | { ok: false; status: number; error: string };

export async function resolveAiModel(team: TeamRef, modelId: string): Promise<ResolveResult> {
  // Find any custom endpoint (regardless of provider) that lists this model
  const customEndpoints = await prisma.customEndpoint.findMany({
    where: { teamId: team.id },
  });

  const matchingEndpoint = customEndpoints.find((endpoint: any) => {
    const models = endpoint.models ? JSON.parse(endpoint.models) : [];
    return models.includes(modelId);
  });

  if (!matchingEndpoint) {
    return {
      ok: false,
      status: 400,
      error: `Model "${modelId}" niet gevonden in een Custom Endpoint. Configureer een endpoint met dit model via Instellingen.`,
    };
  }

  const apiKey = matchingEndpoint.apiKey ? decrypt(matchingEndpoint.apiKey) : null;
  // Local LLM endpoints (e.g. LM Studio, Ollama) may not require an API key
  const effectiveKey = apiKey || "no-key-required";

  const baseURL = matchingEndpoint.baseUrl || undefined;

  // Anthropic endpoints use the Anthropic SDK; everything else (openai/custom) uses OpenAI-compatible SDK
  const aiModel =
    matchingEndpoint.provider === "anthropic"
      ? createAnthropic({ apiKey: effectiveKey, baseURL })(modelId)
      : createOpenAI({ apiKey: effectiveKey, baseURL })(modelId);

  return { ok: true, aiModel, usingPlatformKey: false };
}

export async function consumeCredit(teamId: string) {
  await prisma.team.update({ where: { id: teamId }, data: { credits: { decrement: 1 } } });
}

export async function logUsage(
  teamId: string,
  source: "chat" | "api",
  model: string,
  usage?: { promptTokens?: number; completionTokens?: number }
) {
  await prisma.usageLog.create({
    data: {
      team: { connect: { id: teamId } },
      source,
      model,
      promptTokens: Number.isNaN(usage?.promptTokens) ? 0 : (usage?.promptTokens ?? 0),
      completionTokens: Number.isNaN(usage?.completionTokens) ? 0 : (usage?.completionTokens ?? 0),
    },
  });
}
