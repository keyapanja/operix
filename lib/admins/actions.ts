"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { getPrimaryAdminUserId } from "@/lib/admins/data";

export type AdminState = { ok?: boolean; error?: string };

/** Promote a team member (who already has a login) to Super Admin.
 *  Only a Super Admin can do this. */
export async function grantSuperAdmin(employeeId: string): Promise<AdminState> {
  const session = await requireCapability("roles:manage");
  if (session.role !== "SUPER_ADMIN") {
    return { error: "Only a Super Admin can grant Super Admin access." };
  }

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: session.companyId, deletedAt: null },
    select: { user: { select: { id: true, role: true } } },
  });
  if (!emp) return { error: "Employee not found" };
  if (!emp.user) return { error: "This person has no login yet — invite them first." };
  if (emp.user.role === "SUPER_ADMIN") return { error: "They're already a Super Admin." };

  await prisma.user.update({ where: { id: emp.user.id }, data: { role: "SUPER_ADMIN" } });
  revalidatePath("/organization");
  return { ok: true };
}

/** Remove Super Admin access from a user (demoted to Employee). Only a Super
 *  Admin can do this; the primary admin and your own account are protected. */
export async function revokeSuperAdmin(userId: string): Promise<AdminState> {
  const session = await requireCapability("roles:manage");
  if (session.role !== "SUPER_ADMIN") {
    return { error: "Only a Super Admin can change Super Admin access." };
  }
  if (userId === session.userId) {
    return { error: "You can't revoke your own Super Admin access." };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, companyId: session.companyId },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "SUPER_ADMIN") return { error: "That user isn't a Super Admin." };

  const primaryId = await getPrimaryAdminUserId(session.companyId);
  if (userId === primaryId) return { error: "The primary admin can't be removed." };

  await prisma.user.update({ where: { id: userId }, data: { role: "EMPLOYEE" } });
  revalidatePath("/organization");
  return { ok: true };
}
