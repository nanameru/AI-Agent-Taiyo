"use client";

import {
  BombIcon,
  FileSearchIcon,
  ListIcon,
  PaletteIcon,
  PenLineIcon,
  PenSquareIcon,
  PresentationIcon,
  SquareMousePointerIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type SlashCommand = {
  name: string;
  description: string;
  icon: ReactNode;
  action: string;
  prompt?: string;
  toPrompt?: (input: string) => string;
  shortcut?: string;
};

export const slashCommands: SlashCommand[] = [
  {
    name: "deepresearch",
    description: "Deep Researchで調査する",
    icon: <FileSearchIcon className="size-3.5" />,
    action: "prompt",
    prompt: "/deepresearch ",
    toPrompt: (input) =>
      `Deep Researchを使って、以下について調査してください。最初にリサーチ計画を作成し、その後に5件検索して次の5クエリを生成する流れを最大5回繰り返してください。\n\n${input}`,
  },
  {
    name: "browser",
    description: "Browserbaseでブラウザ操作する",
    icon: <SquareMousePointerIcon className="size-3.5" />,
    action: "prompt",
    prompt: "/browser ",
    toPrompt: (input) =>
      `Browserbaseのブラウザ操作ツールを使って、以下を実行してください。操作中は右側にライブビューを表示してください。\n\n${input}`,
  },
  {
    name: "slides",
    description: "スライドを生成する",
    icon: <PresentationIcon className="size-3.5" />,
    action: "prompt",
    prompt: "/slides ",
    toPrompt: (input) =>
      `以下の内容でスライド資料を作成してください。createDocumentを使い、kindは必ずpresentationにしてください。\n\n${input}`,
  },
  {
    name: "new",
    description: "Start a new chat",
    icon: <PenSquareIcon className="size-3.5" />,
    action: "new",
  },
  {
    name: "clear",
    description: "Clear current chat",
    icon: <Trash2Icon className="size-3.5" />,
    action: "clear",
  },
  {
    name: "rename",
    description: "Rename current chat",
    icon: <PenLineIcon className="size-3.5" />,
    action: "rename",
  },
  {
    name: "model",
    description: "Change the AI model",
    icon: <ListIcon className="size-3.5" />,
    action: "model",
  },
  {
    name: "theme",
    description: "Toggle dark/light mode",
    icon: <PaletteIcon className="size-3.5" />,
    action: "theme",
  },
  {
    name: "delete",
    description: "Delete current chat",
    icon: <XIcon className="size-3.5" />,
    action: "delete",
  },
  {
    name: "purge",
    description: "Delete all chats",
    icon: <BombIcon className="size-3.5" />,
    action: "purge",
  },
];

type SlashCommandMenuProps = {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
};

export function SlashCommandMenu({
  query,
  onSelect,
  onClose: _onClose,
  selectedIndex,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const filtered = slashCommands.filter((cmd) =>
    cmd.name.startsWith(query.toLowerCase())
  );

  useEffect(() => {
    const selected = menuRef.current?.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, []);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-[var(--shadow-float)] backdrop-blur-xl"
      ref={menuRef}
    >
      <div className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
        Commands
      </div>
      <div className="max-h-64 overflow-y-auto pb-1 no-scrollbar">
        {filtered.map((cmd, index) => (
          <button
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
              index === selectedIndex ? "bg-muted/70" : "hover:bg-muted/40"
            )}
            data-selected={index === selectedIndex}
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <div className="flex size-6 shrink-0 items-center justify-center text-muted-foreground/60">
              {cmd.icon}
            </div>
            <span className="font-mono text-[13px] text-foreground">
              /{cmd.name}
            </span>
            <span className="text-[12px] text-muted-foreground/50">
              {cmd.description}
            </span>
            {cmd.shortcut && (
              <span className="ml-auto text-[11px] text-muted-foreground/30">
                {cmd.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
