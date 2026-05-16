"use client";

import dynamic from "next/dynamic";

const AnnouncementBanner = dynamic(
  () =>
    import("@/components/announcements/announcement-banner").then(
      (mod) => mod.AnnouncementBanner
    ),
  { ssr: false }
);

export function AnnouncementBannerClient(props: {
  announcementId: string;
  title: string;
  body: string;
  coverImage?: string | null;
}) {
  return (
    <AnnouncementBanner
      announcement={{
        id: props.announcementId,
        title: props.title,
        body: props.body,
        coverImage: props.coverImage ?? null,
      }}
    />
  );
}
