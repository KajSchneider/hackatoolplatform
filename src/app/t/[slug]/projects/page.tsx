import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/");

  const projects = await prisma.project.findMany({
    where: { teamId: team.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <form
          action={async (formData) => {
            "use server";
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;
            const projectSlug = name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 40);

            await prisma.project.create({
              data: { name, slug: projectSlug, description, teamId: team.id },
            });
            redirect(`/t/${slug}/projects`);
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="Project name"
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
        {projects.map((project: any) => (
          <div
            key={project.id}
            className="rounded border bg-white p-4 shadow-sm hover:shadow-md"
          >
            <h3 className="text-lg font-semibold">{project.name}</h3>
            {project.description && (
              <p className="mt-1 text-sm text-gray-600">{project.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {project.status === "published" ? "🚀 Live" : "📝 Draft"}
              </span>
              <a
                href={`/t/${slug}/projects/${project.id}`}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Open IDE
              </a>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No projects yet. Create your first project above.
          </div>
        )}
      </div>
    </div>
  );
}
