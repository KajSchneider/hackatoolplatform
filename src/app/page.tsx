import Link from "next/link";
import { Bot, KeyRound, Users, Workflow, Code2, FolderGit2 } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";

const features = [
  { icon: Bot, title: "AI Chatbots", desc: "Streaming chat met OpenAI en Anthropic modellen." },
  { icon: KeyRound, title: "Custom Endpoints", desc: "Gebruik je eigen API keys per team." },
  { icon: Users, title: "Teams", desc: "Werk samen in teams met gedeelde gesprekken en keys." },
  { icon: Code2, title: "Apps bouwen", desc: "AI-gestuurde IDE-omgeving met Monaco editor." },
  { icon: Workflow, title: "Agent workflows", desc: "Ketens van AI-agents automatiseren." },
  { icon: FolderGit2, title: "GitHub", desc: "Verbind je repositories met encrypted PAT." },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
      <div className="text-center">
        <Logo size="lg" className="justify-center" />
        <p className="mt-4 max-w-xl text-lg text-gray-500 dark:text-slate-400">
          Eén platform voor AI-chatbots, API endpoints, apps, workflows en teamwerk.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Gratis starten
          </Link>
          <Link href="/login" className="btn-secondary">
            Inloggen
          </Link>
        </div>
      </div>
      <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card">
            <f.icon className="h-6 w-6 text-accent-500" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
