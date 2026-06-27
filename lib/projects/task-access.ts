import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { logTaskActivity } from "@/lib/activity";

// ---------------------------------------------------------------------------
// Session-agnostic task-edit access + checklist toggle. Shared by the web
// Server Actions (lib/projects/actions.ts) and the extension API. A task may
// only be edited by the person who created/assigned it, by one of its
// assignees, or by a Super Admin (org-wide override).
// ---------------------------------------------------------------------------

export async function canEditTask(session: SessionUser, taskId: string): Promise<boolean> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { companyId: session.companyId } },
    select: { createdById: true, assignees: { select: { employeeId: true } } },
  });
  if (!task) return false;
  const isCreator = task.createdById === session.userId;
  const isAssignee =
    !!session.employeeId && task.assignees.some((a) => a.employeeId === session.employeeId);
  return isCreator || isAssignee || session.role === "SUPER_ADMIN";
}

export async function toggleChecklistItemFor(
  session: SessionUser,
  itemId: string,
  isDone: boolean,
): Promise<{ ok?: boolean; error?: string; taskId?: string }> {
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, task: { project: { companyId: session.companyId } } },
    select: { taskId: true, text: true },
  });
  if (!item) return { error: "Item not found" };
  if (!(await canEditTask(session, item.taskId))) return { error: "No access" };
  await prisma.checklistItem.update({ where: { id: itemId }, data: { isDone } });
  await logTaskActivity(session, item.taskId, `${isDone ? "checked" : "unchecked"} '${item.text}'`);
  return { ok: true, taskId: item.taskId };
}
