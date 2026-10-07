"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { approveProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

interface ApproveProjectButtonProps {
  projectId: string;
}

export function ApproveProjectButton({ projectId }: ApproveProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await approveProject(projectId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Proyecto aprobado y publicado correctamente.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle className="h-3.5 w-3.5" />
      )}
      Aprobar
    </Button>
  );
}
