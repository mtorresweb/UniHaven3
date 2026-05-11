"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleReaction } from "@/app/actions/comments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReactionType = "LIKE" | "LOVE" | "CELEBRATE" | "THINKING";

type Reaction = { type: string; count: number; active: boolean };

interface ProjectReactionsProps {
  projectId: string;
  reactions: Reaction[];
  isLoggedIn: boolean;
}

const REACTION_ORDER: ReactionType[] = ["LIKE", "LOVE", "CELEBRATE", "THINKING"];

const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  LIKE: { emoji: "👍", label: "Me gusta" },
  LOVE: { emoji: "❤️", label: "Me encanta" },
  CELEBRATE: { emoji: "🎉", label: "Celebrar" },
  THINKING: { emoji: "🤔", label: "Interesante" },
};

export function ProjectReactions({ projectId, reactions, isLoggedIn }: ProjectReactionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localReactions, setLocalReactions] = useState(() =>
    REACTION_ORDER.map((type) => {
      const reaction = reactions.find((item) => item.type === type);
      return {
        type,
        count: reaction?.count ?? 0,
        active: reaction?.active ?? false,
      };
    })
  );

  const loginHref = useMemo(
    () => `/login?callbackUrl=${encodeURIComponent(`/projects/${projectId}`)}`,
    [projectId]
  );

  function handleToggle(type: ReactionType) {
    if (!isLoggedIn) {
      router.push(loginHref);
      return;
    }

    let nextActive = false;

    setLocalReactions((current) =>
      current.map((reaction) => {
        if (reaction.type !== type) return reaction;
        nextActive = !reaction.active;
        return {
          ...reaction,
          active: nextActive,
          count: Math.max(0, reaction.count + (reaction.active ? -1 : 1)),
        };
      })
    );

    startTransition(async () => {
      const result = await toggleReaction({ projectId, type });

      if (result.error) {
        setLocalReactions((current) =>
          current.map((reaction) => {
            if (reaction.type !== type) return reaction;
            return {
              ...reaction,
              active: !nextActive,
              count: Math.max(0, reaction.count + (nextActive ? -1 : 1)),
            };
          })
        );
        toast.error(result.error);
        return;
      }

      if (typeof result.active === "boolean" && result.active !== nextActive) {
        setLocalReactions((current) =>
          current.map((reaction) => {
            if (reaction.type !== type) return reaction;
            return {
              ...reaction,
              active: result.active ?? false,
              count: Math.max(0, reaction.count + (result.active ? 1 : -1)),
            };
          })
        );
      }

      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Reacciones</h2>
      <div className="flex flex-wrap gap-2">
        {localReactions.map((reaction) => {
          const meta = REACTION_META[reaction.type];
          return (
            <Button
              key={reaction.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleToggle(reaction.type)}
              disabled={isPending}
              aria-pressed={reaction.active}
              title={isLoggedIn ? meta.label : "Inicia sesión para reaccionar"}
              className={cn(
                "gap-2 rounded-full px-3",
                reaction.active && "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
              )}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {meta.emoji}
              </span>
              <span>{reaction.count}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
