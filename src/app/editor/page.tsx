"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EditorView } from "@/components/editor/EditorView";

export default function EditorPage() {
  return (
    <AppShell>
      {({ workspace }) => (
        <Suspense>
          <EditorView workspace={workspace} />
        </Suspense>
      )}
    </AppShell>
  );
}
