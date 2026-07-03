import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const servers = await prisma.mcpServer.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(servers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { name, transportType, url, command, args, env, headers } = body;

  if (!name || !transportType) {
    return NextResponse.json(
      { error: "Naam en transport type zijn verplicht" },
      { status: 400 }
    );
  }

  if (transportType === "sse" && !url) {
    return NextResponse.json(
      { error: "URL is verplicht voor SSE transport" },
      { status: 400 }
    );
  }

  if (transportType === "stdio" && !command) {
    return NextResponse.json(
      { error: "Command is verplicht voor stdio transport" },
      { status: 400 }
    );
  }

  const server = await prisma.mcpServer.create({
    data: {
      name,
      transportType,
      url: url || null,
      command: command || null,
      args: args ? JSON.stringify(args) : null,
      env: env ? JSON.stringify(env) : null,
      headers: headers ? JSON.stringify(headers) : null,
      team: { connect: { id: team.id } },
    },
  });

  return NextResponse.json(server, { status: 201 });
}
