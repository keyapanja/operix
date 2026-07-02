import "server-only";
import { prisma } from "@/lib/db";

export type AdminRow = {
  userId: string;
  name: string;
  email: string;
  isPrimary: boolean; // the earliest Super Admin — protected, can't be removed
  isSelf: boolean;
};

/**
 * Super Admins in a company, earliest-created first. The earliest is the
 * "primary" admin (the original account, e.g. the one created at go-live) —
 * it's protected from removal and is the source of truth for managing admins.
 */
export async function listSuperAdmins(companyId: string, sessionUserId: string): Promise<AdminRow[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: "SUPER_ADMIN" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, email: true, employee: { select: { fullName: true } } },
  });
  return users.map((u, i) => ({
    userId: u.id,
    name: u.employee?.fullName ?? u.email,
    email: u.email,
    isPrimary: i === 0,
    isSelf: u.id === sessionUserId,
  }));
}

/** Team members with a login who aren't already Super Admins — i.e. promotable. */
export async function listPromotableEmployees(
  companyId: string,
): Promise<{ employeeId: string; name: string }[]> {
  const emps = await prisma.employee.findMany({
    where: {
      companyId,
      deletedAt: null,
      user: { is: { isActive: true, role: { not: "SUPER_ADMIN" } } },
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
  return emps.map((e) => ({ employeeId: e.id, name: e.fullName }));
}

/** The protected primary admin's userId (earliest Super Admin), or null. */
export async function getPrimaryAdminUserId(companyId: string): Promise<string | null> {
  const first = await prisma.user.findFirst({
    where: { companyId, role: "SUPER_ADMIN" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return first?.id ?? null;
}
