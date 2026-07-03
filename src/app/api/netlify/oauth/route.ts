import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateOAuthState, OAUTH_STATE_COOKIE } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const clientId = process.env.NETLIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Netlify OAuth niet geconfigureerd" }, { status: 500 });
  }

  const { state, cookieValue } = generateOAuthState();
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/netlify/callback`;
  const authUrl = `https://app.netlify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read write&state=${state}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
