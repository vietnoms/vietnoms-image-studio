"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratePanel } from "@/components/studio/GeneratePanel";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { type Workspace } from "@/lib/constants";

export default function StudioPage() {
  const [workspace, setWorkspace] = useState<Workspace>("vietnoms");
  const [totalCost, setTotalCost] = useState(0);
  const drive = useGoogleDrive();

  const handleCostUpdate = (cost: number) => {
    setTotalCost((prev) => prev + cost);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspace={workspace} onWorkspaceChange={setWorkspace} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          workspace={workspace}
          totalCost={totalCost}
          driveStatus={{
            configured: drive.configured,
            connected: drive.connected,
            isConnecting: drive.isConnecting,
          }}
          onDriveConnect={drive.connect}
          onDriveDisconnect={drive.disconnect}
        />
        <main className="flex-1 overflow-hidden">
          <GeneratePanel workspace={workspace} onCostUpdate={handleCostUpdate} />
        </main>
      </div>
    </div>
  );
}
