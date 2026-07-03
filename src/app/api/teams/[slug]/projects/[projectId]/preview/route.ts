import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
    include: { files: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Build a simple HTML page that includes all project files
  const htmlFiles = project.files.filter((f: any) => f.path.endsWith(".html"));
  const jsFiles = project.files.filter((f: any) => f.path.endsWith(".js"));
  const cssFiles = project.files.filter((f: any) => f.path.endsWith(".css"));

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Preview</title>
  ${cssFiles.map((f: any) => `<style>${f.content}</style>`).join("\n")}
</head>
<body>
`;

  // If there's an index.html, use its body content + head inline styles
  const indexHtml = htmlFiles.find((f: any) => f.path === "index.html");
  if (indexHtml) {
    // Extract inline styles from <head> (including <style> tags)
    const headMatch = indexHtml.content.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    if (headMatch) {
      const styleTags = headMatch[1].match(/<style[^>]*>[\s\S]*?<\/style>/gi);
      if (styleTags) {
        html += styleTags.join("\n") + "\n";
      }
    }
    // Extract body content
    const bodyMatch = indexHtml.content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      html += bodyMatch[1];
    } else {
      html += indexHtml.content;
    }
  } else {
    html += `<h1>${project.name}</h1><p>No index.html found. Add files to see preview.</p>`;
  }

  html += `
  ${jsFiles.map((f: any) => `<script>${f.content}</script>`).join("\n")}
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
