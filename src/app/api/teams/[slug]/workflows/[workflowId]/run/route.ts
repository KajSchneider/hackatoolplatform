import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership, isTeamActive } from "@/lib/teams";
import { streamText } from "ai";
import { resolveAiModel } from "@/lib/ai";
import { loadMcpTools } from "@/lib/mcp";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  if (!isTeamActive(team)) {
    return NextResponse.json({ error: "Hackathon is niet actief" }, { status: 403 });
  }

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const userId = (session as any).user.id;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
    include: { steps: { orderBy: { order: "asc" }, include: { chatbot: true } } },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await req.json();
  const { input } = body;

  // Create a workflow run
  const run = await prisma.workflowRun.create({
    data: {
      status: "running",
      input: input ? JSON.stringify(input) : null,
      startedAt: new Date(),
      workflowId: workflow.id,
    },
  });

  // Execute steps sequentially
  let stepOutputs: any[] = [];
  let error: string | null = null;

  for (const step of workflow.steps) {
    const config = JSON.parse(step.config);
    
    try {
      if (step.type === "prompt") {
        const { prompt, model } = config;
        if (!model) throw new Error("Model is required");
        const resolved = await resolveAiModel(team, model);
        if (!resolved.ok) throw new Error(resolved.error);
        
        // Build context from previous steps
        const context = stepOutputs.length > 0 
          ? `\n\nPrevious step outputs:\n${JSON.stringify(stepOutputs, null, 2)}`
          : "";
        
        // Load MCP tools for workflow steps
        const { tools: mcpTools, clients: mcpClients } = await loadMcpTools(team.id);
        const mcpToolNames = Object.keys(mcpTools);
        
        try {
          const result = await streamText({
            model: resolved.aiModel,
            system: "You are a helpful AI assistant. Use the provided context to answer." + (mcpToolNames.length > 0 ? `\n\n## MCP TOOLS\nJe hebt toegang tot ${mcpToolNames.length} MCP tool(s): ${mcpToolNames.join(", ")}.\n\nBELANGRIJK: Roep deze tools DAADWERKELIJK aan. Simuleer NOOIT resultaten. Toon echte resultaten inclusief links.` : ""),
            tools: mcpToolNames.length > 0 ? mcpTools : undefined,
            maxSteps: mcpToolNames.length > 0 ? 5 : 1,
            prompt: prompt + context,
          });
          
          const { text } = await result;
          stepOutputs.push({ stepId: step.id, type: "prompt", output: text });
        } finally {
          mcpClients.forEach((c) => c.close().catch(() => {}));
        }
      } else if (step.type === "agent") {
        // Agent step - more complex logic would go here
        stepOutputs.push({ stepId: step.id, type: "agent", output: "Agent execution not yet implemented" });
      } else if (step.type === "tool") {
        // Tool step - would integrate with files, chatbots, projects
        stepOutputs.push({ stepId: step.id, type: "tool", output: "Tool execution not yet implemented" });
      }
    } catch (e: any) {
      error = e.message;
      break;
    }
  }

  // Update run with results
  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: error ? "failed" : "completed",
      output: JSON.stringify(stepOutputs),
      error,
      completedAt: new Date(),
    },
  });

  // Log audit
  await logAudit({
    action: "run",
    resource: "workflow",
    resourceId: workflow.id,
    userId,
    teamId: team.id,
    metadata: { runId: run.id, status: error ? "failed" : "completed" },
  });

  return NextResponse.json({
    runId: run.id,
    status: error ? "failed" : "completed",
    outputs: stepOutputs,
    error,
  });
}
