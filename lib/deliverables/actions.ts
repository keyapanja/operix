"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/auth/guard";

export type DeliverableState = { ok?: boolean; error?: string };

const DeliverableSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  link: z.string().trim().url("Enter a valid URL (https://…)").max(2000).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type DeliverableInput = { name: string; link?: string; description?: string };

async function ownedProject(companyId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, companyId, deletedAt: null },
    select: { id: true },
  });
}

/** Publish a deliverable for the client to review (status SUBMITTED). */
export async function publishDeliverable(
  projectId: string,
  input: DeliverableInput,
): Promise<DeliverableState> {
  const session = await requireCapability("project:manage");
  const parsed = DeliverableSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const project = await ownedProject(session.companyId, projectId);
  if (!project) return { error: "Project not found" };

  await prisma.deliverable.create({
    data: {
      projectId: project.id,
      name: d.name,
      link: d.link || null,
      description: d.description || null,
      status: "SUBMITTED",
      submittedById: session.userId,
    },
  });
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

/** Edit a deliverable. Saving re-presents it to the client (status → SUBMITTED). */
export async function updateDeliverable(
  id: string,
  input: DeliverableInput,
): Promise<DeliverableState> {
  const session = await requireCapability("project:manage");
  const parsed = DeliverableSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const existing = await prisma.deliverable.findFirst({
    where: { id, project: { companyId: session.companyId, deletedAt: null } },
    select: { id: true, projectId: true },
  });
  if (!existing) return { error: "Deliverable not found" };

  await prisma.deliverable.update({
    where: { id: existing.id },
    data: {
      name: d.name,
      link: d.link || null,
      description: d.description || null,
      // Re-submitting for review: clear the prior decision.
      status: "SUBMITTED",
      feedback: null,
      decidedAt: null,
      decidedById: null,
      submittedById: session.userId,
      submittedAt: new Date(),
    },
  });
  revalidatePath(`/projects/${existing.projectId}`);
  return { ok: true };
}

export async function deleteDeliverable(id: string): Promise<DeliverableState> {
  const session = await requireCapability("project:manage");
  const existing = await prisma.deliverable.findFirst({
    where: { id, project: { companyId: session.companyId, deletedAt: null } },
    select: { id: true, projectId: true },
  });
  if (!existing) return { error: "Deliverable not found" };

  await prisma.deliverable.delete({ where: { id: existing.id } });
  revalidatePath(`/projects/${existing.projectId}`);
  return { ok: true };
}
