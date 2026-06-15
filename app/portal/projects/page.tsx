import type { Metadata } from "next";
import { requirePortal } from "@/lib/auth/guard";
import { listClientProjects } from "@/lib/portal/data";
import { Card } from "@/components/ui/card";
import { ProjectCard } from "@/components/portal/project-card";

export const metadata: Metadata = { title: "Projects · Client Portal" };

export default async function PortalProjectsPage() {
  const session = await requirePortal();
  const projects = await listClientProjects(session.clientId, session.companyId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-content">Projects</h1>
      {projects.length === 0 ? (
        <Card className="px-5 py-16 text-center text-sm text-muted">No projects yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
