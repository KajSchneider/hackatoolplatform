import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import IDE from "@/components/IDE";
import GitHubSettings from "@/components/GitHubSettings";
import ProjectHeader from "@/components/ProjectHeader";

export default async function IDEPage({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug, groupSlug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) notFound();
  const group = await prisma.group.findUnique({
    where: { teamId_slug: { teamId: team.id, slug: groupSlug } },
  });
  if (!group) notFound();

  const [project, customEndpoints] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId, groupId: group.id },
      include: { gitHubConnections: true },
    }),
    prisma.customEndpoint.findMany({
      where: { teamId: team.id },
      select: { provider: true, models: true },
    }),
  ]);
  if (!project) redirect(`/t/${slug}/groups/${groupSlug}/projects`);

  const customModels: { id: string; label: string }[] = [];
  for (const endpoint of customEndpoints) {
    const models = endpoint.models ? JSON.parse(endpoint.models) : [];
    for (const model of models) {
      customModels.push({ id: model, label: model });
    }
  }

  return (
    <div className="h-screen bg-white dark:bg-brand-700">
      <ProjectHeader
        project={project}
        teamSlug={slug}
        groupSlug={groupSlug}
        connections={project.gitHubConnections}
      />
      <IDE projectId={project.id} teamSlug={slug} groupSlug={groupSlug} customModels={customModels} />
    </div>
  );
}
