import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { verifyOAuthState, OAUTH_STATE_COOKIE } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Geen code ontvangen" }, { status: 400 });
  }

  // Validate OAuth state to prevent CSRF
  const cookieValue = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !cookieValue || !verifyOAuthState(state, cookieValue)) {
    return NextResponse.json({ error: "Ongeldige OAuth state" }, { status: 400 });
  }

  const clientId = process.env.NETLIFY_CLIENT_ID;
  const clientSecret = process.env.NETLIFY_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/netlify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Netlify OAuth niet geconfigureerd" }, { status: 500 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.netlify.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json({ error: "Token exchange failed", details: error }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: "Geen access token ontvangen" }, { status: 500 });
    }

    // Get user info
    const userResponse = await fetch("https://api.netlify.com/v1/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: "User info fetch failed" }, { status: 500 });
    }

    const userData = await userResponse.json();

    // Create or update Netlify account
    const encryptedToken = encrypt(accessToken);
    await prisma.netlifyAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: encryptedToken,
      },
      update: {
        accessToken: encryptedToken,
        updatedAt: new Date(),
      },
    });

    const res = NextResponse.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (error) {
    console.error("Netlify OAuth error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
