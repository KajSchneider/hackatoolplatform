"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Ongeldige inloggegevens");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md">
        <Logo size="md" className="mb-6" />
        <h1 className="text-2xl font-bold">Inloggen</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500 dark:text-slate-400">Welkom terug bij Hackatool.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="input"
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Bezig..." : "Inloggen"}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
          Nog geen account?{" "}
          <Link href="/register" className="text-accent-500 hover:underline">
            Registreren
          </Link>
        </p>
      </div>
    </main>
  );
}
