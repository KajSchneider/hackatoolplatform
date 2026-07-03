import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

interface DocSection {
  type: "heading" | "paragraph" | "list";
  level?: number;
  text?: string;
  items?: string[];
}

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
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { format, title, sections, fileName } = body as {
    format: "pdf" | "docx";
    title: string;
    sections: DocSection[];
    fileName: string;
  };

  if (!format || !sections || !fileName) {
    return NextResponse.json({ error: "format, sections en fileName zijn verplicht" }, { status: 400 });
  }

  const sectionArray: DocSection[] = Array.isArray(sections) ? sections : (sections as any)?.sections;
  if (!Array.isArray(sectionArray)) {
    return NextResponse.json({ error: "sections moet een array zijn" }, { status: 400 });
  }

  if (format === "pdf") {
    const pdfBytes = await generatePDF(title, sectionArray);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      },
    });
  } else if (format === "docx") {
    const docxBytes = await generateDOCX(title, sectionArray);
    return new NextResponse(Buffer.from(docxBytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}.docx"`,
      },
    });
  }

  return NextResponse.json({ error: "Ongeldig formaat. Gebruik 'pdf' of 'docx'." }, { status: 400 });
}

async function generatePDF(title: string, sections: DocSection[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const wrapText = (text: string, fontUsed: typeof font, size: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (fontUsed.widthOfTextAtSize(testLine, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Title
  ensureSpace(30);
  page.drawText(title, { x: margin, y, size: 20, font: boldFont, color: rgb(0, 0, 0) });
  y -= 30;

  for (const section of sections) {
    if (section.type === "heading") {
      const size = section.level === 1 ? 16 : section.level === 2 ? 14 : 12;
      ensureSpace(size + 10);
      y -= 5;
      page.drawText(section.text || "", { x: margin, y, size, font: boldFont, color: rgb(0, 0, 0) });
      y -= size + 8;
    } else if (section.type === "paragraph") {
      const lines = wrapText(section.text || "", font, 11);
      for (const line of lines) {
        ensureSpace(16);
        page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 16;
      }
      y -= 4;
    } else if (section.type === "list" && section.items) {
      for (const item of section.items) {
        const lines = wrapText(item, font, 11);
        ensureSpace(16);
        page.drawText("•", { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) ensureSpace(16);
          page.drawText(lines[i], { x: margin + 15, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
          y -= 16;
        }
      }
      y -= 4;
    }
  }

  return pdfDoc.save();
}

async function generateDOCX(title: string, sections: DocSection[]): Promise<Uint8Array> {
  const headingLevels: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40 })],
      spacing: { after: 200 },
    }),
  ];

  for (const section of sections) {
    if (section.type === "heading") {
      children.push(
        new Paragraph({
          heading: headingLevels[section.level || 1] || HeadingLevel.HEADING_1,
          children: [new TextRun({ text: section.text || "" })],
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (section.type === "paragraph") {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.text || "" })],
          spacing: { after: 120 },
        })
      );
    } else if (section.type === "list" && section.items) {
      for (const item of section.items) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
