import { prisma } from "@/lib/prisma";

export async function logAudit({
  action,
  resource,
  resourceId,
  userId,
  teamId,
  metadata,
}: {
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  teamId: string;
  metadata?: Record<string, any>;
}) {
  await prisma.auditLog.create({
    data: {
      action,
      resource,
      resourceId,
      userId,
      teamId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
