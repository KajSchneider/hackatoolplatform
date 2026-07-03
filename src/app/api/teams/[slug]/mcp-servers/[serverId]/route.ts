import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; serverId: string }> }
) {
  const { slug, serverId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const server = await prisma.mcpServer.findFirst({
    where: { id: serverId, teamId: team.id },
  });
  if (!server) {
    return NextResponse.json({ error: "MCP server niet gevonden" }, { status: 404 });
  }

  const body = await req.json();
  const { name, transportType, url, command, args, env, headers, enabled } = body;

  const updated = await prisma.mcpServer.update({
    where: { id: serverId },
    data: {
      name: name ?? server.name,
      transportType: transportType ?? server.transportType,
      url: url !== undefined ? url : server.url,
      command: command !== undefined ? command : server.command,
      args: args !== undefined ? (args ? JSON.stringify(args) : null) : server.args,
      env: env !== undefined ? (env ? JSON.stringify(env) : null) : server.env,
      headers: headers !== undefined ? (headers ? JSON.stringify(headers) : null) : server.headers,
      enabled: enabled !== undefined ? enabled : server.enabled,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; serverId: string }> }
) {
  const { slug, serverId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const server = await prisma.mcpServer.findFirst({
    where: { id: serverId, teamId: team.id },
  });
  if (!server) {
    return NextResponse.json({ error: "MCP server niet gevonden" }, { status: 404 });
  }

  await prisma.mcpServer.delete({
    where: { id: serverId },
  });

  return NextResponse.json({ success: true });
}
