"use client";

import { useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { removeProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

interface RemoveProjectButtonProps {
  projectId: string;
  note: string;
  label?: string;
}

export function RemoveProjectButton({
  projectId,
  note,
  label = "Eliminar proyecto",
}: RemoveProjectButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await removeProject(projectId, note);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Proyecto eliminado correctamente.");
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
      {label}
    </Button>
  );
}
