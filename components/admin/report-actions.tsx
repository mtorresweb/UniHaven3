"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Eye, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { dismissReport } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { RemoveProjectButton } from "@/components/admin/remove-project-button";

interface ReportActionsProps {
  reportId: string;
  projectId: string;
  removeNote: string;
}

export function ReportActions({
  reportId,
  projectId,
  removeNote,
}: ReportActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissReport(reportId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Reporte desestimado.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/projects/${projectId}`}>
          <Eye className="h-3.5 w-3.5" />
          Ver proyecto
        </Link>
      </Button>

      <RemoveProjectButton projectId={projectId} note={removeNote} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDismiss}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Desestimar
      </Button>
    </div>
  );
}
