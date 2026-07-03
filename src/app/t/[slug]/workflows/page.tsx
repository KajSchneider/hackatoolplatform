import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function WorkflowsPage({
  params,
}: {
  params: { slug: string };
}) {
  const team = await prisma.team.findUnique({ where: { slug: params.slug } });
  if (!team) redirect("/");

  const workflows = await prisma.workflow.findMany({
    where: { teamId: team.id },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <form
          action={async (formData) => {
            "use server";
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;

            await prisma.workflow.create({
              data: { name, description, teamId: team.id },
            });
            redirect(`/t/${params.slug}/workflows`);
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="Workflow name"
            required
            className="rounded border px-3 py-2"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="rounded border px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            Create
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow: any) => (
          <div
            key={workflow.id}
            className="rounded border bg-white p-4 shadow-sm hover:shadow-md"
          >
            <h3 className="text-lg font-semibold">{workflow.name}</h3>
            {workflow.description && (
              <p className="mt-1 text-sm text-gray-600">{workflow.description}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              {workflow.steps.length} steps
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`/t/${params.slug}/workflows/${workflow.id}`}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Edit
              </a>
              <a
                href={`/t/${params.slug}/workflows/${workflow.id}/runs`}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Runs
              </a>
            </div>
          </div>
        ))}
        {workflows.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No workflows yet. Create your first workflow above.
          </div>
        )}
      </div>
    </div>
  );
}
