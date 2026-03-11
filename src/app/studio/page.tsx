"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GeneratePanel } from "@/components/studio/GeneratePanel";

export default function StudioPage() {
  const [totalCost, setTotalCost] = useState(0);

  const handleCostUpdate = (cost: number) => {
    setTotalCost((prev) => prev + cost);
  };

  return (
    <AppShell totalCost={totalCost}>
      {({ workspace }) => (
        <GeneratePanel workspace={workspace} onCostUpdate={handleCostUpdate} />
      )}
    </AppShell>
  );
}
