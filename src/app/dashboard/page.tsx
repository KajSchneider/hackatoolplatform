import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ArrowRight, Shield } from "lucide-react";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import TeamCreator from "@/components/TeamCreator";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Jouw teams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Ingelogd als {session.user.email}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && (
            <Link href="/admin" className="btn-secondary flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-secondary">
              Uitloggen
            </button>
          </form>
        </div>
      </div>

      <div className="mb-8 space-y-3">
        {memberships.length === 0 && (
          <div className="rounded border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-brand-600 dark:bg-brand-600">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Je bent nog niet toegewezen aan een hackathon. Vraag de platform beheerder om je toe te voegen.
            </p>
          </div>
        )}
        {memberships.map((m: any) => (
          <Link
            key={m.id}
            href={`/t/${m.team.slug}/chat`}
            className="card flex items-center justify-between transition hover:border-accent-500"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-accent-500" />
              <div>
                <p className="font-medium text-accent-500 dark:text-slate-100">{m.team.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  {m.role} · {m.team.credits} credits
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 dark:text-slate-500" />
          </Link>
        ))}
      </div>

      {user?.role === "admin" && (
        <div className="card">
          <TeamCreator />
        </div>
      )}
    </main>
  );
}
