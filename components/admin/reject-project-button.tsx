"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { removeProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

interface RejectProjectButtonProps {
  projectId: string;
  note: string;
}

export function RejectProjectButton({ projectId, note }: RejectProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await removeProject(projectId, note);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Proyecto rechazado correctamente.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      Rechazar
    </Button>
  );
}
