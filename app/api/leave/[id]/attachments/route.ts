import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { makeFileKey, saveUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Upload files (multipart field "files") onto a leave request — e.g. a medical
// certificate for sick leave. Files are written to disk; only metadata goes in
// the DB (Attachment). The applicant (own request) or a leave manager may attach.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id: leaveRequestId } = await ctx.params;

  const lr = await prisma.leaveRequest.findFirst({
    where: { id: leaveRequestId, companyId: session.companyId },
    select: { id: true, employeeId: true },
  });
  if (!lr) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

  const isOwner = !!session.employeeId && lr.employeeId === session.employeeId;
  const canManage = await hasPermission(session.companyId, session.role, "leave:manage");
  if (!isOwner && !canManage) {
    return NextResponse.json({ error: "No access to this leave request" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const created: { id: string; fileName: string }[] = [];
  for (const file of files) {
    const key = makeFileKey(file.name);
    await saveUpload(key, Buffer.from(await file.arrayBuffer()));
    const row = await prisma.attachment.create({
      data: {
        leaveRequestId,
        fileKey: key,
        fileName: file.name.slice(0, 200) || "file",
        mimeType: file.type || null,
        sizeBytes: file.size,
        uploadedBy: session.userId,
      },
      select: { id: true, fileName: true },
    });
    created.push(row);
  }
  return NextResponse.json({ ok: true, attachments: created });
}
