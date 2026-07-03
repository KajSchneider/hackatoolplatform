import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import IDE from "@/components/IDE";
import GitHubSettings from "@/components/GitHubSettings";
import ProjectHeader from "@/components/ProjectHeader";

export default async function IDEPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/");

  const [project, customEndpoints] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, group: { teamId: team.id } },
      include: { gitHubConnections: true, group: { select: { slug: true } } },
    }),
    prisma.customEndpoint.findMany({
      where: { teamId: team.id },
      select: { provider: true, models: true },
    }),
  ]);
  if (!project) redirect(`/t/${slug}/projects`);

  const customModels: { id: string; label: string }[] = [];
  for (const endpoint of customEndpoints) {
    const models = endpoint.models ? JSON.parse(endpoint.models) : [];
    for (const model of models) {
      customModels.push({ id: model, label: model });
    }
  }

  return (
    <div className="h-screen">
      <ProjectHeader
        project={project}
        teamSlug={slug}
        groupSlug={project.group.slug}
        connections={project.gitHubConnections}
      />
      <IDE projectId={project.id} teamSlug={slug} customModels={customModels} />
    </div>
  );
}
