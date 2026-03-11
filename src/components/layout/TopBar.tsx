"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORKSPACES, type Workspace } from "@/lib/constants";

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  isConnecting: boolean;
}

interface TopBarProps {
  workspace: Workspace;
  totalCost: number;
  driveStatus: DriveStatus;
  onDriveConnect: () => void;
  onDriveDisconnect: () => void;
  onToggleSidebar?: () => void;
}

export function TopBar({ workspace, totalCost, driveStatus, onDriveConnect, onDriveDisconnect, onToggleSidebar }: TopBarProps) {
  const ws = WORKSPACES[workspace];

  return (
    <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Hamburger menu for mobile */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <Badge
          variant="outline"
          className="font-medium text-xs px-2.5 py-0.5 rounded-full flex-shrink-0"
          style={{ borderColor: ws.color, color: ws.color }}
        >
          {ws.label}
        </Badge>
        <span className="text-xs text-muted-foreground hidden md:inline truncate">{ws.description}</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Google Drive status */}
        {driveStatus.configured && (
          <div className="flex items-center">
            {driveStatus.connected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 .75-7.425A4.5 4.5 0 0 0 12.75 6a4.5 4.5 0 0 0-4.28 3.1A4.5 4.5 0 0 0 2.25 15Z" />
                  </svg>
                  Drive
                </div>
                <button
                  onClick={onDriveDisconnect}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDriveConnect}
                disabled={driveStatus.isConnecting}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 rounded-full"
              >
                {driveStatus.isConnecting ? (
                  <>
                    <svg className="w-3 h-3 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 .75-7.425A4.5 4.5 0 0 0 12.75 6a4.5 4.5 0 0 0-4.28 3.1A4.5 4.5 0 0 0 2.25 15Z" />
                    </svg>
                    Connect Drive
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Cost tracker */}
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</span>
          <span className="text-xs font-mono font-semibold text-foreground">${totalCost.toFixed(2)}</span>
        </div>
      </div>
    </header>
  );
}
