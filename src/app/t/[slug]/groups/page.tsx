import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/teams";
import { Plus } from "lucide-react";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      groups: {
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!team) notFound();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Groups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Manage teams within {team.name}
          </p>
        </div>
        <form
          action={async (formData) => {
            "use server";
            const name = formData.get("name") as string;
            if (!name) return;

            const s = await auth();
            if (!s?.user?.id) redirect("/login");

            const t = await prisma.team.findUnique({ where: { slug } });
            if (!t) notFound();

            const groupSlug = slugify(name);
            const group = await prisma.group.create({
              data: {
                name,
                slug: groupSlug,
                team: { connect: { id: t.id } },
              },
            });

            await prisma.groupMembership.create({
              data: {
                userId: s.user.id,
                groupId: group.id,
                role: "admin",
              },
            });

            redirect(`/t/${slug}/groups`);
          }}
        >
          <div className="flex gap-2">
            <input
              name="name"
              placeholder="Group name"
              required
              className="rounded border px-3 py-2"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {team.groups.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-brand-600 dark:bg-brand-600">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              No groups yet. Create your first group to start organizing your hackathon.
            </p>
          </div>
        ) : (
          team.groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-brand-600 dark:bg-brand-600"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{group.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-500">/{group.slug}</p>
                </div>
                <div className="flex gap-4 text-sm text-gray-500 dark:text-slate-500">
                  <span>{group.memberships.length} members</span>
                  <span>{group.projects.length} projects</span>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Members</h4>
                <div className="flex flex-wrap gap-2">
                  {group.memberships.map((m) => (
                    <span
                      key={m.user.id}
                      className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-brand-500 dark:text-slate-300"
                    >
                      {m.user.name || m.user.email}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">Projects</h4>
                <div className="flex flex-wrap gap-2">
                  {group.projects.map((p) => (
                    <span
                      key={p.id}
                      className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {p.name}
                    </span>
                  ))}
                  {group.projects.length === 0 && (
                    <span className="text-sm text-gray-500 dark:text-slate-500">No projects yet</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
