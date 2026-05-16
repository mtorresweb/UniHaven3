"use client";

import Image from "next/image";
import { useState } from "react";
import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementBannerProps {
  announcement: {
    id: string;
    title: string;
    body: string;
    coverImage?: string | null;
  };
}

const STORAGE_KEY = "unihaven:dismissed-announcement";

export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem(STORAGE_KEY) === announcement.id
  );

  if (dismissed) {
    return null;
  }

  function handleDismiss() {
    window.localStorage.setItem(STORAGE_KEY, announcement.id);
    setDismissed(true);
  }

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-start">
      {announcement.coverImage ? (
        <div className="relative h-32 w-full overflow-hidden rounded-xl sm:h-24 sm:w-40">
          <Image
            src={announcement.coverImage}
            alt={announcement.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Pin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-foreground">{announcement.title}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{announcement.body}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={handleDismiss}
          aria-label="Cerrar anuncio"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
