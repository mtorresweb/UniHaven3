"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateDM } from "@/app/actions/dm";
import { Button } from "@/components/ui/button";

type StartDMButtonProps = {
  targetUserId: string;
};

export function StartDMButton({ targetUserId }: StartDMButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { chatId } = await getOrCreateDM(targetUserId);
        router.push(`/messages?chat=${chatId}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo abrir la conversación.",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      Mensaje
    </Button>
  );
}
