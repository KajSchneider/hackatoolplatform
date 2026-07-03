import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { streamText } from "ai";
import { resolveAiModel } from "@/lib/ai";
import { loadMcpTools } from "@/lib/mcp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  const { slug, projectId } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) return NextResponse.json({ error: "Team niet gevonden" }, { status: 404 });

  const session = await requireMembership(team.id);
  if (session instanceof NextResponse) return session;

  const project = await prisma.project.findFirst({
    where: { id: projectId, group: { teamId: team.id } },
    include: { files: true },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { message, model, history } = body;

  if (!message) {
    return NextResponse.json({ error: "Bericht is verplicht" }, { status: 400 });
  }
  if (!model) {
    return NextResponse.json({ error: "Model is verplicht" }, { status: 400 });
  }

  // Build context from project files
  const fileContext = project.files
    .map((f: any) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const systemPrompt = `Je bent een volledige AI agent voor een project IDE (zoals Cascade/Cursor). Je kunt code schrijven, Python scripts uitvoeren, en documenten genereren (PDF/DOCX).

Je hebt toegang tot deze projectbestanden:
${fileContext || "Nog geen bestanden in dit project."}

Je hebt DRIE tools tot je beschikking. Gebruik ze afhankelijk van wat de gebruiker vraagt:

## 1. BESTANDEN AANMAKEN/BIJWERKEN
Gebruik dit formaat om bestanden te maken of aan te passen:

FILE: bestandsnaam.ext
\`\`\`taal
code hier
\`\`\`

De IDE maakt het bestand automatisch aan.

## 2. PYTHON SCRIPT UITVOEREN
Gebruik dit formaat om een Python script uit te voeren. De output (stdout/stderr) wordt teruggegeven aan de gebruiker:

RUN_PYTHON:
\`\`\`python
print("Hello world")
\`\`\`

Alle projectbestanden zijn beschikbaar in de werkdirectory van het script. Je kunt ook bestanden maken met FILE: blokken en ze daarna met RUN_PYTHON verwerken.

## 3. DOCUMENTEN GENEREREN
Gebruik dit formaat om een PDF of DOCX document te genereren:

GENERATE_DOC: bestandsnaam | pdf|docx | Documenttitel
\`\`\`json
{
  "sections": [
    { "type": "heading", "level": 1, "text": "Inleiding" },
    { "type": "paragraph", "text": "Dit is een paragraaf met uitleg." },
    { "type": "heading", "level": 2, "text": "Belangrijkste punten" },
    { "type": "list", "items": ["Punt 1", "Punt 2", "Punt 3"] }
  ]
}
\`\`\`

Het document wordt gedownload door de gebruiker.

## BELANGRIKE REGELS
- Je kunt meerdere tools in één antwoord gebruiken (bijv. eerst FILE: om een script te maken, dan RUN_PYTHON: om het uit te voeren).
- Plaats uitleg altijd NA de tool blokken, niet ervoor.
- Bij RUN_PYTHON: het script krijgt alle projectbestanden in zijn werkdirectory.
- Bij GENERATE_DOC: gebruik geldige JSON met sections array. Elk section heeft type "heading", "paragraph" of "list".
- Schrijf altijd in het Nederlands tenzij de gebruiker om Engels vraagt.

Voorbeeld combinatie:
Gebruiker: "Maak een Python script dat een berekening doet en genereer een PDF rapport"
Jij:
FILE: calculate.py
\`\`\`python
result = sum(range(1, 101))
print(f"Som van 1 tot 100: {result}")
\`\`\`

RUN_PYTHON:
\`\`\`python
exec(open("calculate.py").read())
\`\`\`

GENERATE_DOC: berekeningsrapport | pdf | Rapport: Berekeningen
\`\`\`json
{
  "sections": [
    { "type": "heading", "level": 1, "text": "Berekeningsrapport" },
    { "type": "paragraph", "text": "Dit rapport bevat de uitkomsten van de berekeningen." },
    { "type": "heading", "level": 2, "text": "Resultaten" },
    { "type": "list", "items": ["Som van 1 tot 100: 5050"] }
  ]
}
\`\`\`

Ik heb het script uitgevoerd en een PDF rapport gegenereerd.
`;

  const resolved = await resolveAiModel(team, model);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  // Load MCP tools for this team
  const { tools: mcpTools, clients: mcpClients } = await loadMcpTools(team.id);
  const mcpToolNames = Object.keys(mcpTools);

  const mcpInfo = mcpToolNames.length > 0
    ? `\n\n## MCP TOOLS\nJe hebt toegang tot ${mcpToolNames.length} MCP tool(s): ${mcpToolNames.join(", ")}.\n\nBELANGRIJK: Roep deze tools DAADWERKELIJK aan via de tool calling interface. Simuleer NOOIT tool resultaten of verzinsel geen antwoorden.\n- Wanneer een vraag relevant is voor een beschikbare tool, roep de tool dan aan.\n- Toon de echte resultaten die de tool teruggeeft, inclusief links en URLs.\n- Als de tool geen resultaten vindt, zeg dat dan eerlijk.\n- Gebruik de tool resultaten om een goed antwoord te formuleren.`
    : "";

  try {
    const result = streamText({
      model: resolved.aiModel,
      system: systemPrompt + mcpInfo,
      tools: mcpToolNames.length > 0 ? mcpTools : undefined,
      maxSteps: mcpToolNames.length > 0 ? 5 : 1,
      messages: [
        ...(history || []).map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    return result.toTextStreamResponse();
  } finally {
    // Close MCP clients after response is sent
    // Note: clients will be closed after a short delay to allow streaming
    setTimeout(() => {
      mcpClients.forEach((c) => c.close().catch(() => {}));
    }, 5000);
  }
}
