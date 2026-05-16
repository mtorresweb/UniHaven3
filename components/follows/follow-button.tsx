"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  toggleProjectFollow,
  toggleUserFollow,
} from "@/app/actions/follows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FollowButtonProps = {
  type: "user" | "project";
  targetId: string;
  initialFollowing: boolean;
  followerCount: number;
};

export function FollowButton({
  type,
  targetId,
  initialFollowing,
  followerCount,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followerCount);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const previousFollowing = following;
    const previousCount = count;
    const optimisticFollowing = !previousFollowing;

    setFollowing(optimisticFollowing);
    setCount(Math.max(0, previousCount + (optimisticFollowing ? 1 : -1)));

    startTransition(async () => {
      try {
        const action = type === "user" ? toggleUserFollow : toggleProjectFollow;
        const result = await action(targetId);

        setFollowing(result.following);
        setCount(
          Math.max(
            0,
            previousCount + (result.following === previousFollowing ? 0 : result.following ? 1 : -1),
          ),
        );
        router.refresh();
      } catch (error) {
        setFollowing(previousFollowing);
        setCount(previousCount);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el seguimiento.",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant={following ? "default" : "outline"}
      className={cn("w-full justify-center gap-2", following && "shadow-sm")}
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={following}
    >
      {isPending ? null : type === "project" ? (
        following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />
      ) : (
        following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />
      )}
      <span>
        {type === "project"
          ? following ? "Dejar de seguir" : "Seguir proyecto"
          : following ? "Siguiendo" : "Seguir"}
      </span>
      <Badge variant="secondary" className="px-2 py-0 text-xs">
        {count}
      </Badge>
    </Button>
  );
}
