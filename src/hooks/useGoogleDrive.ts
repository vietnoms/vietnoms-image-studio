"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GoogleDriveState {
  configured: boolean;
  connected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useGoogleDrive() {
  const [state, setState] = useState<GoogleDriveState>({
    configured: false,
    connected: false,
    isConnecting: false,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google-drive/status");
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          configured: data.configured,
          connected: data.connected,
          error: null,
        }));
        return data;
      }
    } catch {
      // Silently fail — Drive is optional
    }
    return null;
  }, []);

  // Check status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Get the auth URL
      const res = await fetch("/api/auth/google-drive");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get auth URL");
      }
      const { authUrl } = await res.json();

      // Open popup
      const popup = window.open(
        authUrl,
        "google-drive-auth",
        "width=600,height=700,left=200,top=100"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for connection status
      pollRef.current = setInterval(async () => {
        const status = await fetchStatus();
        if (status?.connected) {
          // Connected! Stop polling
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setState((prev) => ({ ...prev, isConnecting: false }));

          // Close popup if still open
          try { popup.close(); } catch { /* ignore */ }
        }
      }, 2000);

      // Also stop polling after 2 minutes (timeout)
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: "Connection timed out. Please try again.",
          }));
        }
      }, 120000);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [fetchStatus]);

  const disconnect = useCallback(async () => {
    try {
      await fetch("/api/auth/google-drive/disconnect", { method: "POST" });
      setState((prev) => ({ ...prev, connected: false }));
    } catch {
      // Silently fail
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    refreshStatus: fetchStatus,
  };
}
