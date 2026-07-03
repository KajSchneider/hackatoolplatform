import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/teams";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

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
  const { script, args } = body as { script: string; args?: string };

  if (!script) {
    return NextResponse.json({ error: "Script is verplicht" }, { status: 400 });
  }

  const tmpDir = join(tmpdir(), `hackatool-py-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    // Write all project files to the temp dir so the script can access them
    for (const file of project.files) {
      const filePath = join(tmpDir, file.path);
      const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
      if (lastSlash > 0) {
        await mkdir(filePath.substring(0, lastSlash), { recursive: true }).catch(() => {});
      }
      await writeFile(filePath, file.content);
    }

    // Write the script
    const scriptPath = join(tmpDir, "_agent_script.py");
    await writeFile(scriptPath, script);

    // Run the script with a timeout
    const cmd = `python "${scriptPath}" ${args || ""}`;
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: tmpDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    return NextResponse.json({
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
    });
  } catch (error: any) {
    const stdout = error.stdout?.toString() || "";
    const stderr = error.stderr?.toString() || error.message || "Onbekende fout";
    const exitCode = error.code ?? 1;

    return NextResponse.json({
      stdout,
      stderr,
      exitCode,
      error: stderr,
    });
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
