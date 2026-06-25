"use client";

import {
  ExternalLinkIcon,
  FileSearchIcon,
  MonitorIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useBrowserPanel } from "@/hooks/use-browser-panel";
import { Button } from "../ui/button";

export function BrowserPanel() {
  const { browserPanel, closeBrowserPanel } = useBrowserPanel();

  if (!browserPanel.isVisible) {
    return (
      <div className="h-dvh w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />
    );
  }

  const isResearch = browserPanel.mode === "research";

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
                {isResearch ? (
                  <FileSearchIcon className="size-3" />
                ) : (
                  <MonitorIcon className="size-3" />
                )}
                {isResearch ? "Deep Research" : "手動操作モード"}
              </span>
              {browserPanel.timeoutSeconds && (
                <span>{browserPanel.timeoutSeconds}秒セッション</span>
              )}
            </div>
          </div>
        </div>

        {browserPanel.liveViewUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={browserPanel.liveViewUrl} rel="noreferrer" target="_blank">
              新規タブ
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 bg-background">
        {isResearch ? (
          <ResearchPanelContent research={browserPanel.research} />
        ) : (
          browserPanel.liveViewUrl && (
            <iframe
              allow="clipboard-read; clipboard-write; fullscreen"
              className="h-full w-full border-0 bg-background"
              src={browserPanel.liveViewUrl}
              title={browserPanel.title || "Browserbase Live View"}
            />
          )
        )}
      </div>
    </div>
  );
}

function ResearchPanelContent({
  research,
}: {
  research: ReturnType<typeof useBrowserPanel>["browserPanel"]["research"];
}) {
  const rounds = research?.rounds ?? [];
  const plan = research?.plan;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {plan && (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 font-semibold text-base">
              <FileSearchIcon className="size-4" />
              {plan.title}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-muted-foreground text-[11px]">Rounds</div>
                <div className="font-semibold text-sm">{plan.rounds}</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-muted-foreground text-[11px]">
                  Queries / round
                </div>
                <div className="font-semibold text-sm">
                  {plan.searchesPerRound}
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-muted-foreground text-[11px]">
                  Results / query
                </div>
                <div className="font-semibold text-sm">
                  {plan.resultsPerQuery}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {plan.steps.map((step) => (
                <div className="flex gap-2 text-sm" key={step}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {research?.isLoading && rounds.length === 0 && (
          <div className="space-y-7 rounded-lg border bg-card p-6">
            {[0, 1, 2, 3].map((item) => (
              <div className="space-y-3" key={item}>
                <div className="h-3 w-2/5 rounded-full bg-muted" />
                <div className="h-3 w-4/5 rounded-full bg-muted" />
                <div className="h-3 w-3/5 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        )}

        {rounds.map((round) => (
          <section className="rounded-lg border bg-card p-5" key={round.round}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <SearchIcon className="size-4" />
                Round {round.round}
              </div>
              <div className="text-muted-foreground text-xs">
                {round.searches?.reduce(
                  (sum, search) => sum + (search.results?.length ?? 0),
                  0
                ) ?? 0}{" "}
                sources
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {(round.queries ?? []).map((query) => (
                <span
                  className="rounded-full border bg-muted/40 px-2 py-1 text-xs"
                  key={query}
                >
                  {query}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {(round.searches ?? []).map((search) => (
                <div
                  className="rounded-md border bg-background p-3"
                  key={search.query}
                >
                  <div className="mb-2 font-medium text-sm">{search.query}</div>
                  {search.error ? (
                    <div className="text-destructive text-xs">
                      {search.error}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(search.results ?? []).slice(0, 5).map((result) => (
                        <a
                          className="block rounded-md p-2 transition-colors hover:bg-muted/50"
                          href={result.url}
                          key={result.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <div className="line-clamp-1 font-medium text-xs">
                            {result.title}
                          </div>
                          {result.description && (
                            <div className="mt-1 line-clamp-2 text-muted-foreground text-[11px]">
                              {result.description}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(round.nextQueries ?? []).length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="mb-2 text-muted-foreground text-xs">
                  Next generated queries
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(round.nextQueries ?? []).map((query) => (
                    <span
                      className="rounded-full bg-primary/10 px-2 py-1 text-primary text-xs"
                      key={query}
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
