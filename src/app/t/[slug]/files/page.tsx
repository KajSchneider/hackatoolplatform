import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FileManager from "@/components/FileManager";

export default async function FilesPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const files = await prisma.storedFile.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Bestanden</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gedeelde bestanden voor team {team.name} (max 10 MB per bestand).
      </p>
      <div className="mt-8">
        <FileManager
          teamSlug={slug}
          files={files.map((f: any) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
            createdAt: f.createdAt,
          }))}
        />
      </div>
    </main>
  );
}
