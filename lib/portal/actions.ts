"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePortalAction } from "@/lib/auth/guard";
import { logTaskActivity } from "@/lib/activity";

export type PortalActionState = { ok?: boolean; error?: string };

// Notifications back to the internal team. Ownership is always re-checked here
// (the proxy is only the first line of defense — see proxy.ts note).
async function notifyInternal(
  userIds: (string | null | undefined)[],
  type: string,
  title: string,
  body: string,
  meta: Record<string, string>,
) {
  const targets = [...new Set(userIds.filter((u): u is string => !!u))];
  if (!targets.length) return;
  await prisma.notification.createMany({
    data: targets.map((userId) => ({ userId, type, title, body, meta })),
  });
}

// ---- Tasks in CLIENT_REVIEW ------------------------------------------------

function loadClientTask(clientId: string, companyId: string, taskId: string) {
  return prisma.task.findFirst({
    // clientId in the WHERE = the ownership check; a foreign task returns null.
    where: { id: taskId, deletedAt: null, project: { clientId, companyId, deletedAt: null } },
    select: {
      id: true,
      name: true,
      status: true,
      projectId: true,
      createdById: true,
      assignees: { select: { employee: { select: { user: { select: { id: true } } } } } },
    },
  });
}

export async function clientApproveTask(taskId: string): Promise<PortalActionState> {
  const session = await requirePortalAction();
  const task = await loadClientTask(session.clientId, session.companyId, taskId);
  if (!task) return { error: "Task not found" };
  if (task.status !== "CLIENT_REVIEW") return { error: "This task isn't awaiting your review." };

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logTaskActivity(session, task.id, "Client approved the work — marked completed");
  await notifyInternal(
    [task.createdById, ...task.assignees.map((a) => a.employee.user?.id)],
    "TASK",
    "Client approved",
    `The client approved “${task.name}”.`,
    { taskId: task.id },
  );

  revalidatePath("/portal");
  revalidatePath(`/portal/projects/${task.projectId}`);
  return { ok: true };
}

export async function clientRequestTaskChanges(
  taskId: string,
  feedback: string,
): Promise<PortalActionState> {
  const session = await requirePortalAction();
  const fb = feedback.trim();
  if (!fb) return { error: "Please describe what needs to change." };
  if (fb.length > 2000) return { error: "Feedback is too long." };

  const task = await loadClientTask(session.clientId, session.companyId, taskId);
  if (!task) return { error: "Task not found" };
  if (task.status !== "CLIENT_REVIEW") return { error: "This task isn't awaiting your review." };

  // Back to the team; clear the submitted link so they re-submit a fresh one.
  await prisma.task.update({ where: { id: task.id }, data: { status: "REDO", finalLink: null } });

  await logTaskActivity(session, task.id, `Client requested changes: ${fb}`);
  await notifyInternal(
    [task.createdById, ...task.assignees.map((a) => a.employee.user?.id)],
    "TASK",
    "Client requested changes",
    `On “${task.name}”: ${fb}`,
    { taskId: task.id },
  );

  revalidatePath("/portal");
  revalidatePath(`/portal/projects/${task.projectId}`);
  return { ok: true };
}

// ---- Deliverables ----------------------------------------------------------

function loadClientDeliverable(clientId: string, companyId: string, deliverableId: string) {
  return prisma.deliverable.findFirst({
    where: { id: deliverableId, project: { clientId, companyId, deletedAt: null } },
    select: { id: true, name: true, status: true, projectId: true, submittedById: true },
  });
}

export async function clientApproveDeliverable(deliverableId: string): Promise<PortalActionState> {
  const session = await requirePortalAction();
  const d = await loadClientDeliverable(session.clientId, session.companyId, deliverableId);
  if (!d) return { error: "Deliverable not found" };
  if (d.status !== "SUBMITTED") return { error: "This deliverable has already been reviewed." };

  await prisma.deliverable.update({
    where: { id: d.id },
    data: { status: "APPROVED", decidedAt: new Date(), decidedById: session.userId, feedback: null },
  });

  await notifyInternal(
    [d.submittedById],
    "DELIVERABLE",
    "Deliverable approved",
    `The client approved the deliverable “${d.name}”.`,
    { projectId: d.projectId, deliverableId: d.id },
  );

  revalidatePath("/portal");
  revalidatePath("/portal/deliverables");
  revalidatePath(`/portal/projects/${d.projectId}`);
  return { ok: true };
}

export async function clientRequestDeliverableRevision(
  deliverableId: string,
  feedback: string,
): Promise<PortalActionState> {
  const session = await requirePortalAction();
  const fb = feedback.trim();
  if (!fb) return { error: "Please describe what needs to change." };
  if (fb.length > 2000) return { error: "Feedback is too long." };

  const d = await loadClientDeliverable(session.clientId, session.companyId, deliverableId);
  if (!d) return { error: "Deliverable not found" };
  if (d.status !== "SUBMITTED") return { error: "This deliverable has already been reviewed." };

  await prisma.deliverable.update({
    where: { id: d.id },
    data: { status: "REVISION_REQUESTED", decidedAt: new Date(), decidedById: session.userId, feedback: fb },
  });

  await notifyInternal(
    [d.submittedById],
    "DELIVERABLE",
    "Revision requested",
    `The client requested a revision on “${d.name}”: ${fb}`,
    { projectId: d.projectId, deliverableId: d.id },
  );

  revalidatePath("/portal");
  revalidatePath("/portal/deliverables");
  revalidatePath(`/portal/projects/${d.projectId}`);
  return { ok: true };
}
