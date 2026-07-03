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
    where: { group: { teamId: team.id } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-sm text-gray-500">Maak projecten aan binnen een groep.</p>
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
