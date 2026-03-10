"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TemplateBuilderView } from "@/components/template-builder/TemplateBuilderView";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { type Workspace } from "@/lib/constants";

export default function TemplateBuilderPage() {
  const [workspace, setWorkspace] = useState<Workspace>("vietnoms");
  const drive = useGoogleDrive();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspace={workspace} onWorkspaceChange={setWorkspace} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          workspace={workspace}
          totalCost={0}
          driveStatus={{
            configured: drive.configured,
            connected: drive.connected,
            isConnecting: drive.isConnecting,
          }}
          onDriveConnect={drive.connect}
          onDriveDisconnect={drive.disconnect}
        />
        <main className="flex-1 overflow-hidden">
          <TemplateBuilderView workspace={workspace} />
        </main>
      </div>
    </div>
  );
}
