"use client";

import { AppShell } from "@/components/layout/AppShell";
import { CatalogView } from "@/components/catalog/CatalogView";

export default function CatalogPage() {
  return (
    <AppShell>
      {({ workspace }) => <CatalogView workspace={workspace} />}
    </AppShell>
  );
}
