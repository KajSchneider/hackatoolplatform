import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DeploymentApiKey from "@/components/DeploymentApiKey";
import { ExternalLink, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function DeploymentsPage({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug, groupSlug, projectId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/");

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!membership && user?.role !== "admin") notFound();

  const group = await prisma.group.findFirst({
    where: { slug: groupSlug, teamId: team.id },
  });
  if (!group) redirect("/");

  const project = await prisma.project.findUnique({
    where: { id: projectId, groupId: group.id },
  });
  if (!project) redirect("/");

  const deployments = await prisma.deployment.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Deployments</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Deployment geschiedenis voor {project.name}
        </p>
      </div>

      <div className="space-y-4">
        {deployments.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-brand-600 dark:bg-brand-600">
            <p className="text-gray-500 dark:text-slate-400">Nog geen deployments</p>
          </div>
        ) : (
          deployments.map((deployment) => (
            <div
              key={deployment.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-brand-600 dark:bg-brand-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {deployment.status === "deployed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : deployment.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deployment.url && (
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-sm text-blue-500 hover:bg-gray-50 dark:border-brand-600 dark:text-slate-400 dark:hover:bg-brand-500"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Bekijk
                    </a>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await prisma.deployment.delete({
                        where: { id: deployment.id },
                      });
                      redirect(`/t/${slug}/groups/${groupSlug}/projects/${projectId}/deployments`);
                    }}
                  >
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Verwijder
                    </button>
                  </form>
                  {deployment.status === "deployed" && (
                    <DeploymentApiKey
                      teamSlug={slug}
                      groupSlug={groupSlug}
                      projectId={projectId}
                      deploymentId={deployment.id}
                      hasApiKey={!!deployment.publicApiKey}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <a
          href={`/t/${slug}/groups/${groupSlug}/projects/${projectId}`}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          ← Terug naar project
        </a>
      </div>
    </div>
  );
}
