"use client";

import {
  CheckCircle2Icon,
  Loader2Icon,
  LogInIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CodexStatus = {
  connected: boolean;
  message: string;
  details?: string;
};

type CodexLoginResult = {
  started: boolean;
  message: string;
  command?: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function getStatusLabel(status: CodexStatus | null) {
  if (status?.connected) {
    return "Codex連携済み";
  }

  return "ChatGPTログイン";
}

export function CodexConnectButton() {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const refreshStatus = useCallback(async () => {
    setIsChecking(true);

    try {
      const response = await fetch(`${basePath}/api/codex/status`, {
        cache: "no-store",
      });
      const data = (await response.json()) as CodexStatus;
      setStatus(data);
    } catch {
      setStatus({
        connected: false,
        message: "Codex status could not be checked.",
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const startLogin = async () => {
    if (status?.connected) {
      toast.success("Codex is already connected to ChatGPT.");
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch(`${basePath}/api/codex/login`, {
        method: "POST",
      });
      const data = (await response.json()) as CodexLoginResult;

      if (!response.ok) {
        throw new Error(data.message);
      }

      if (data.started) {
        toast.success("TerminalでChatGPTログインを開始しました。");
      } else if (data.command) {
        await navigator.clipboard?.writeText(data.command);
        toast.message("Codexログインコマンドをコピーしました。");
      } else {
        toast.message(data.message);
      }

      setTimeout(() => {
        refreshStatus();
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Codexログインを開始できませんでした。"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const isBusy = isChecking || isStarting;
  const Icon = isBusy
    ? Loader2Icon
    : status?.connected
      ? CheckCircle2Icon
      : status?.details
        ? TriangleAlertIcon
        : LogInIcon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-9 rounded-lg px-3"
            data-testid="codex-connect-button"
            onClick={startLogin}
            variant={status?.connected ? "secondary" : "outline"}
          >
            <Icon className={isBusy ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden lg:inline">{getStatusLabel(status)}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent align="end" className="max-w-sm">
          {status?.connected
            ? "Codex is connected to your local ChatGPT login."
            : (status?.details ??
              "Start ChatGPT login for local Codex integration.")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
