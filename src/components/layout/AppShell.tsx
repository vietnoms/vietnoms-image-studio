"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { type Workspace } from "@/lib/constants";

interface AppShellProps {
  children: (props: { workspace: Workspace }) => React.ReactNode;
  totalCost?: number;
  onCostUpdate?: (cost: number) => void;
}

export function AppShell({ children, totalCost = 0 }: AppShellProps) {
  const [workspace, setWorkspace] = useState<Workspace>("vietnoms");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drive = useGoogleDrive();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar: hidden on mobile by default, overlay when open */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          workspace={workspace}
          onWorkspaceChange={setWorkspace}
          onClose={closeSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-hidden">
          {children({ workspace })}
        </main>
      </div>
    </div>
  );
}
