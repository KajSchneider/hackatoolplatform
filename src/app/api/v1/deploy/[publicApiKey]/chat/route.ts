import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { streamText, generateText } from "ai";
import { resolveAiModel, logUsage } from "@/lib/ai";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicApiKey: string }> }
) {
  const { publicApiKey } = await params;
  const tokenHash = hashToken(publicApiKey);

  const deployment = await prisma.deployment.findUnique({
    where: { publicApiKey: tokenHash },
    include: {
      project: {
        include: {
          group: {
            include: {
              team: {
                include: {
                  customEndpoints: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!deployment) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (deployment.status !== "deployed") {
    return NextResponse.json({ error: "Deployment not active" }, { status: 400 });
  }

  // Rate limiting: 100 req/min per deployment
  const rateLimit = checkRateLimit(`deploy:${deployment.id}`, 100, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      }
    );
  }

  const body = await req.json();
  const { model, messages, stream = false } = body;

  if (!model || !messages) {
    return NextResponse.json({ error: "Model and messages required" }, { status: 400 });
  }

  try {
    const result = await resolveAiModel(deployment.project.group.team, model);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const teamId = deployment.project.group.team.id;

    if (stream) {
      const streamResult = streamText({
        model: result.aiModel,
        messages,
        onFinish: async ({ usage }) => {
          await logUsage(teamId, "api", model, usage);
        },
      });

      return streamResult.toDataStreamResponse();
    } else {
      const generateResult = await generateText({
        model: result.aiModel,
        messages,
      });

      await logUsage(teamId, "api", model, generateResult.usage);

      return NextResponse.json({
        content: generateResult.text,
        usage: generateResult.usage,
      });
    }
  } catch (error) {
    console.error("Public API chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
