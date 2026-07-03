import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/rbac";

export default async function TeamSettingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const team = await prisma.team.findUnique({ where: { slug: params.slug } });
  if (!team) redirect("/");

  const isAdmin = await hasRole(session.user.id, team.id, "admin");
  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-red-600">You need admin or owner permissions to access team settings.</p>
      </div>
    );
  }

  const members = await prisma.membership.findMany({
    where: { teamId: team.id },
    include: { user: true },
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Team Settings</h1>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Members</h2>
        <div className="space-y-2">
          {members.map((membership: any) => (
            <div
              key={membership.id}
              className="flex items-center justify-between rounded border bg-white p-4 shadow-sm"
            >
              <div>
                <div className="font-medium">{membership.user.name || membership.user.email}</div>
                <div className="text-sm text-gray-500">{membership.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs capitalize">
                  {membership.role}
                </span>
                {membership.role !== "owner" && (
                  <form
                    action={async (formData) => {
                      "use server";
                      const newRole = formData.get("role") as string;
                      await prisma.membership.update({
                        where: { id: membership.id },
                        data: { role: newRole },
                      });
                      redirect(`/t/${params.slug}/settings`);
                    }}
                    className="flex gap-1"
                  >
                    <select
                      name="role"
                      defaultValue={membership.role}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-accent-500"
                    >
                      Save
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Team Info</h2>
        <div className="rounded border bg-white p-4 shadow-sm">
          <div className="mb-2">
            <span className="font-semibold">Name:</span> {team.name}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Slug:</span> {team.slug}
          </div>
          <div>
            <span className="font-semibold">Credits:</span> {team.credits}
          </div>
        </div>
      </div>
    </div>
  );
}
