import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const providers = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Wachtwoord", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user?.passwordHash) return null;
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Include role in token for admin redirect
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      if (session.user && token.role) session.user.role = token.role as string;
      return session;
    },
    async signIn({ user, account }) {
      // Ensure GitHub OAuth users exist in our DB
      if (account?.provider === "github" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (!existing) {
          // De eerste gebruiker wordt automatisch platform admin.
          const userCount = await prisma.user.count();
          const created = await prisma.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name,
              role: userCount === 0 ? "admin" : "user",
            },
          });
          user.id = created.id;
        } else {
          user.id = existing.id;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Redirect admins to /admin after login
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/admin`;
      }
      return url;
    },
  },
});
