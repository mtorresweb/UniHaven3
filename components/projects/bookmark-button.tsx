"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, BookmarkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleBookmark } from "@/app/actions/bookmarks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  projectId: string;
  initialBookmarked: boolean;
  disabled?: boolean;
}

export function BookmarkButton({
  projectId,
  initialBookmarked,
  disabled = false,
}: BookmarkButtonProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const previousValue = bookmarked;
    const optimisticValue = !previousValue;

    setBookmarked(optimisticValue);

    startTransition(async () => {
      try {
        const result = await toggleBookmark(projectId);
        setBookmarked(result.bookmarked);
        router.refresh();
      } catch (error) {
        setBookmarked(previousValue);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el marcador.",
        );
      }
    });
  }

  const Icon = bookmarked ? BookmarkCheck : BookmarkIcon;

  return (
    <Button
      type="button"
      variant={bookmarked ? "default" : "outline"}
      className={cn(
        "w-full justify-center gap-2 mt-4",
        bookmarked && "shadow-sm",
      )}
      aria-pressed={bookmarked}
      onClick={handleToggle}
      disabled={disabled || isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className={cn("h-4 w-4 ", bookmarked && "fill-current")} />
      )}
      {bookmarked ? "Guardado en marcadores" : "Guardar en marcadores"}
    </Button>
  );
}
