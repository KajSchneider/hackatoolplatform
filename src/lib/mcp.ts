import { experimental_createMCPClient as createMCPClient, type ToolSet } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { prisma } from "@/lib/prisma";

export async function loadMcpTools(teamId: string): Promise<{ tools: ToolSet; clients: { close: () => Promise<void> }[] }> {
  const servers = await prisma.mcpServer.findMany({
    where: { teamId, enabled: true },
  });

  const clients: { close: () => Promise<void> }[] = [];
  const allTools: ToolSet = {};

  for (const server of servers) {
    try {
      let client;

      if (server.transportType === "sse") {
        const headers = server.headers ? JSON.parse(server.headers) : undefined;
        client = await createMCPClient({
          transport: {
            type: "sse",
            url: server.url!,
            headers,
          },
        });
      } else if (server.transportType === "stdio") {
        const args = server.args ? JSON.parse(server.args) : [];
        const env = server.env ? JSON.parse(server.env) : undefined;
        client = await createMCPClient({
          transport: new Experimental_StdioMCPTransport({
            command: server.command!,
            args,
            env,
          }),
        });
      }

      if (client) {
        const tools = await client.tools();
        Object.assign(allTools, tools);
        clients.push(client);
      }
    } catch (error) {
      console.error(`Failed to connect to MCP server "${server.name}":`, error);
    }
  }

  return { tools: allTools, clients };
}
