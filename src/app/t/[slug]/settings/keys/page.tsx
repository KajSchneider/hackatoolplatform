import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import KeyManager from "@/components/KeyManager";

export default async function KeysPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) redirect("/dashboard");
  
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (!membership) redirect("/dashboard");

  const keys = await prisma.apiKey.findMany({
    where: { teamId: team.id },
    select: { id: true, provider: true, label: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">API Keys</h1>
      <p className="mt-1 text-sm text-slate-400">
        Voeg eigen provider-keys toe (BYOK). Zonder eigen key gebruikt het team platform-credits
        ({team.credits} resterend).
      </p>
      <div className="mt-8">
        <KeyManager
          teamSlug={slug}
          keys={keys.map((k: any) => ({
            id: k.id,
            provider: k.provider,
            label: k.label,
            createdAt: k.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
