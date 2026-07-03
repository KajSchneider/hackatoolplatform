import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { ExternalLink, Unlink, CheckCircle } from "lucide-react";

export default async function NetlifySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const netlifyAccount = await prisma.netlifyAccount.findUnique({
    where: { userId: session.user.id },
  });

  let netlifyUser = null;
  if (netlifyAccount) {
    try {
      const accessToken = decrypt(netlifyAccount.accessToken);
      const response = await fetch("https://api.netlify.com/v1/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        netlifyUser = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch Netlify user:", error);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Netlify Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Koppel je Netlify account om projecten te deployen
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-brand-600 dark:bg-brand-600">
        {netlifyAccount && netlifyUser ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">Netlify Account Gekoppeld</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {netlifyUser.full_name || netlifyUser.email}
                </p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await prisma.netlifyAccount.delete({
                  where: { userId: session.user.id },
                });
                redirect("/settings/netlify");
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Unlink className="h-4 w-4" />
                Ontkoppel Account
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Netlify Account Niet Gekoppeld</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Koppel je Netlify account om projecten te deployen naar Netlify
            </p>
            <a
              href="/api/netlify/oauth"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-accent-500"
            >
              <ExternalLink className="h-4 w-4" />
              Koppel Netlify Account
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-brand-600 dark:bg-brand-600">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Deployment Limiet</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Maximaal 25 deployments per gebruiker. Elke deployment genereert een public URL voor je project.
        </p>
      </div>
    </div>
  );
}
