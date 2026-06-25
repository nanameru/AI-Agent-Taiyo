"use client";

import { ExternalLinkIcon, MonitorIcon, XIcon } from "lucide-react";
import { useBrowserPanel } from "@/hooks/use-browser-panel";
import { Button } from "../ui/button";

export function BrowserPanel() {
  const { browserPanel, closeBrowserPanel } = useBrowserPanel();

  if (!browserPanel.isVisible) {
    return (
      <div className="h-dvh w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />
    );
  }

  return (
    <div
      className="flex h-dvh w-[60%] shrink-0 flex-col overflow-hidden border-l border-border/50 bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      data-testid="browser-panel"
    >
      <div className="flex h-[calc(3.5rem+1px)] shrink-0 items-center justify-between border-b border-border/50 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Close browser panel"
            className="size-8"
            onClick={closeBrowserPanel}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="truncate font-semibold text-sm tracking-tight">
              {browserPanel.title || "Browserbase Live View"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span className="inline-flex items-center gap-1">
                <MonitorIcon className="size-3" />
                手動操作モード
              </span>
              {browserPanel.timeoutSeconds && (
                <span>{browserPanel.timeoutSeconds}秒セッション</span>
              )}
            </div>
          </div>
        </div>

        <Button asChild size="sm" variant="outline">
          <a href={browserPanel.liveViewUrl} rel="noreferrer" target="_blank">
            新規タブ
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </Button>
      </div>

      <div className="min-h-0 flex-1 bg-background">
        <iframe
          allow="clipboard-read; clipboard-write; fullscreen"
          className="h-full w-full border-0 bg-background"
          src={browserPanel.liveViewUrl}
          title={browserPanel.title || "Browserbase Live View"}
        />
      </div>
    </div>
  );
}
