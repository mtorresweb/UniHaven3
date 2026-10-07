import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { canUploadProjects } from "@/lib/constants";
import { UploadForm } from "@/components/projects/upload-form";

export const metadata = { title: "Subir proyecto — UniHaven" };
export const maxDuration = 60; // Allow up to 60s for GitHub commits (Vercel)

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user || !canUploadProjects(session.user.role)) {
    redirect("/login?from=/projects/new");
  }

  const areas = await prisma.knowledgeArea.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (areas.length === 0) {
    // Auto-seed on first visit if empty (dev convenience)
    const { seedKnowledgeAreas } = await import("@/lib/db/areas");
    await seedKnowledgeAreas();
    const seeded = await prisma.knowledgeArea.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return <PageContent areas={seeded} />;
  }

  return <PageContent areas={areas} />;
}

function PageContent({ areas }: { areas: { id: string; name: string }[] }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Subir proyecto</h1>
        <p className="mt-1 text-muted-foreground">
          Completa los tres pasos para enviar tu trabajo académico a revisión.
          Un administrador lo aprobará antes de que se publique en el
          repositorio de la Universidad Popular del Cesar.
        </p>
      </div>
      <UploadForm areas={areas} />
    </main>
  );
}
