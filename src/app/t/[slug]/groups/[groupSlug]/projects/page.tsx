import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";

export default async function GroupProjectsPage({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug, groupSlug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) notFound();
  const group = await prisma.group.findUnique({
    where: { teamId_slug: { teamId: team.id, slug: groupSlug } },
  });
  if (!group) notFound();

  const projects = await prisma.project.findMany({
    where: { groupId: group.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 bg-white dark:bg-brand-700">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Projecten</h1>
          <p className="text-sm text-gray-500 dark:text-slate-500">{group.name}</p>
        </div>
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
              data: { name, slug: projectSlug, description, group: { connect: { id: group.id } } },
            });
            redirect(`/t/${slug}/groups/${groupSlug}/projects`);
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="Projectnaam"
            required
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
          />
          <input
            name="description"
            placeholder="Beschrijving (optioneel)"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-brand-500 dark:bg-brand-500 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
          >
            Maak aan
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: any) => (
          <div
            key={project.id}
            className="rounded border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-brand-600 dark:bg-brand-600"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{project.name}</h3>
            {project.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{project.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-slate-500">
                {project.status === "published" ? "🚀 Live" : "📝 Draft"}
              </span>
              <a
                href={`/t/${slug}/groups/${groupSlug}/projects/${project.id}`}
                className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-brand-500 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Open IDE
              </a>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-500">
            Nog geen projecten. Maak hierboven je eerste project aan.
          </div>
        )}
      </div>
    </div>
  );
}
