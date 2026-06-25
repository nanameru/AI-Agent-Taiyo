"use client";

import {
  ExternalLinkIcon,
  FileSearchIcon,
  MonitorIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import {
  type BrowserPanelData,
  useBrowserPanel,
} from "@/hooks/use-browser-panel";
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
  research: BrowserPanelData["research"];
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

        {rounds.length > 0 && (
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 font-semibold text-base">
              <SearchIcon className="size-4" />
              Show thinking
            </div>
            <div className="space-y-8">
              {rounds.map((round) => (
                <ResearchRoundSet key={round.round} round={round} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ResearchRound = NonNullable<
  NonNullable<BrowserPanelData["research"]>["rounds"]
>[number];

function ResearchRoundSet({ round }: { round: ResearchRound }) {
  const sources = getRoundSources(round);
  const failedSearches = (round.searches ?? []).filter(
    (search) => search.error
  );
  const featuredSources = sources.slice(0, 3);

  return (
    <section className="relative pl-10">
      <div className="-left-px absolute top-8 bottom-0 w-px bg-border" />
      <div className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border bg-background">
        <SearchIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 font-semibold text-base">
            Round {round.round}: 検索セットの要約
          </div>
          <div className="space-y-3 text-sm leading-7">
            <p>
              このセットでは
              {formatQueryList(round.queries ?? [])}
              を検索し、{sources.length}件の検索ソースを確認しました。
            </p>
            {featuredSources.length > 0 && (
              <p>
                主要な候補として
                {featuredSources
                  .map((source) => source.title)
                  .filter(Boolean)
                  .join("、")}
                を参照しています。
              </p>
            )}
            {(round.gapsFromInitialQuery ?? []).length > 0 && (
              <p>
                不足している観点として
                {formatQueryList(round.gapsFromInitialQuery ?? [])}
                が見つかったため、次の検索セットへ引き継ぎます。
              </p>
            )}
          </div>
        </div>

        {(round.nextQueries ?? []).length > 0 && (
          <div>
            <div className="mb-2 text-muted-foreground text-xs">
              次に生成されたクエリ
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

        {failedSearches.length > 0 && (
          <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {failedSearches.map((search) => (
              <div key={search.query}>
                {search.query}: {search.error}
              </div>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
              <ExternalLinkIcon className="size-3.5" />
              検索ソース
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.slice(0, 10).map((source) => (
                <a
                  className="flex min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/70"
                  href={source.url}
                  key={source.url}
                  rel="noreferrer"
                  target="_blank"
                  title={source.title}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px]">
                    {source.domain.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {source.domain}
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    {source.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getRoundSources(round: ResearchRound) {
  const seenUrls = new Set<string>();
  const sources: Array<{ domain: string; title: string; url: string }> = [];

  for (const search of round.searches ?? []) {
    for (const result of search.results ?? []) {
      if (!(result.url && result.title) || seenUrls.has(result.url)) {
        continue;
      }

      seenUrls.add(result.url);
      sources.push({
        domain: getDomain(result.url),
        title: result.title,
        url: result.url,
      });
    }
  }

  return sources;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function formatQueryList(queries: string[]) {
  if (queries.length === 0) {
    return "関連クエリ";
  }

  return queries
    .slice(0, 5)
    .map((query) => `「${query}」`)
    .join("、");
}
