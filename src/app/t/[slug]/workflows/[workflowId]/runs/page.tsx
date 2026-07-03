import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function WorkflowRunsPage({
  params,
}: {
  params: Promise<{ slug: string; workflowId: string }>;
}) {
  const { slug, workflowId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/");

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, teamId: team.id },
  });
  if (!workflow) redirect(`/t/${slug}/workflows`);

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: workflow.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workflow.name} - Runs</h1>
          <a
            href={`/t/${slug}/workflows/${workflow.id}`}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            ← Back to workflow
          </a>
        </div>
      </div>

      <div className="space-y-2">
        {runs.map((run: any) => (
          <div
            key={run.id}
            className="rounded border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">Run {run.createdAt.toLocaleString()}</span>
                <span
                  className={`ml-2 rounded px-2 py-1 text-xs ${
                    run.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : run.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {run.status}
                </span>
              </div>
            </div>
            {run.error && (
              <div className="mt-2 text-sm text-red-600">{run.error}</div>
            )}
            {run.output && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold">
                  Output
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {run.output}
                </pre>
              </details>
            )}
          </div>
        ))}
        {runs.length === 0 && (
          <p className="text-sm text-gray-500">No runs yet. Run the workflow to see results.</p>
        )}
      </div>
    </div>
  );
}
