import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkflowBuilder from "@/components/WorkflowBuilder";

export default async function WorkflowEditPage({
  params,
}: {
  params: Promise<{ slug: string; workflowId: string }>;
}) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/");

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!workflow) redirect(`/t/${slug}/workflows`);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workflow.name}</h1>
          {workflow.description && (
            <p className="text-sm text-gray-600">{workflow.description}</p>
          )}
        </div>
        <a
          href={`/t/${slug}/workflows`}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          ← Back to workflows
        </a>
      </div>
      <WorkflowBuilder
        workflowId={workflow.id}
        teamSlug={slug}
        initialSteps={workflow.steps.map((s: any) => ({
          ...s,
          config: JSON.parse(s.config),
        }))}
        initialShared={workflow.shared || false}
      />
    </div>
  );
}
