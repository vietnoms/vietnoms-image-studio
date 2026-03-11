"use client";

import { AppShell } from "@/components/layout/AppShell";
import { GalleryView } from "@/components/gallery/GalleryView";

export default function GalleryPage() {
  return (
    <AppShell>
      {({ workspace }) => <GalleryView workspace={workspace} />}
    </AppShell>
  );
}
