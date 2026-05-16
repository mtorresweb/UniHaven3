"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { reinstateProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

interface ReinstateProjectButtonProps {
  projectId: string;
}

export function ReinstateProjectButton({ projectId }: ReinstateProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await reinstateProject(projectId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Proyecto reintegrado correctamente.");
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
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      Reintegrar
    </Button>
  );
}
