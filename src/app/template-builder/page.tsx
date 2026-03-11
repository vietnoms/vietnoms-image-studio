"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TemplateBuilderView } from "@/components/template-builder/TemplateBuilderView";

export default function TemplateBuilderPage() {
  return (
    <AppShell>
      {({ workspace }) => <TemplateBuilderView workspace={workspace} />}
    </AppShell>
  );
}
