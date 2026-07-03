import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function saveFile(teamId: string, data: Buffer): Promise<string> {
  const relPath = path.join(teamId, crypto.randomBytes(16).toString("hex"));
  const absPath = path.join(UPLOAD_ROOT, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, data);
  return relPath;
}

export async function readStoredFile(relPath: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_ROOT, relPath));
}

export async function deleteStoredFile(relPath: string): Promise<void> {
  await unlink(path.join(UPLOAD_ROOT, relPath)).catch(() => {});
}
