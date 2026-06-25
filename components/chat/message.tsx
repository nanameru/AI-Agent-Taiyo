"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  ExternalLinkIcon,
  GlobeIcon,
  Maximize2Icon,
  MonitorIcon,
  SearchIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBrowserPanel } from "@/hooks/use-browser-panel";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

type UniqloToolOutput = {
  status?: string;
  message?: string;
  browserbase?: {
    sessionId?: string;
    liveViewUrl?: string;
    debuggerUrl?: string;
    debugError?: string;
    keepAlive?: boolean;
    timeoutSeconds?: number;
  };
  products?: Array<{
    name?: string;
    price?: string;
    url?: string;
    reason?: string;
  }>;
  searchUrl?: string;
  purchaseBoundary?: string;
};

type BrowserbaseLiveSessionResponse =
  | { status: "pending" }
  | {
      status: "ready";
      session: {
        title: string;
        liveViewUrl: string;
        sessionId?: string;
        sourceUrl?: string;
        status?: string;
        timeoutSeconds?: number;
      };
    };

type DeepResearchToolOutput = {
  error?: string;
  initialQuery?: string;
  rounds?: Array<{
    round?: number;
    queries?: string[];
    searches?: Array<{
      query?: string;
      error?: string;
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        age?: string;
      }>;
    }>;
  }>;
  summary?: {
    totalRounds?: number;
    totalSearches?: number;
    totalUniqueResults?: number;
    stoppedByRateLimit?: boolean;
    suggestedFollowUpQueries?: string[];
  };
};

type DeepResearchToolInput = {
  query?: string;
  maxRounds?: number;
  parallelSearches?: number;
  resultsPerQuery?: number;
};

function buildResearchPlan(input: DeepResearchToolInput = {}) {
  return {
    title: input.query ? `${input.query} のリサーチ計画` : "Deep Research plan",
    steps: [
      "リサーチテーマから初期検索クエリを5件作成します。",
      "各クエリで5件ずつ検索し、重複URLを除外して情報源を集めます。",
      "検索結果から不足トピックと関連キーワードを抽出します。",
      "抽出した不足トピックから次ラウンドの5クエリを生成します。",
      "この流れを最大5ラウンド繰り返し、最後に参照ソースと次の追跡クエリを整理します。",
    ],
    rounds: input.maxRounds ?? 5,
    searchesPerRound: input.parallelSearches ?? 5,
    resultsPerQuery: input.resultsPerQuery ?? 5,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function BrowserbaseRunningPreview({ toolCallId }: { toolCallId: string }) {
  const { setBrowserPanel } = useBrowserPanel();
  const [liveSession, setLiveSession] = useState<
    | Extract<BrowserbaseLiveSessionResponse, { status: "ready" }>["session"]
    | null
  >(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const openLiveSession = (
      session: Extract<
        BrowserbaseLiveSessionResponse,
        { status: "ready" }
      >["session"]
    ) => {
      setLiveSession(session);
      setBrowserPanel({
        isVisible: true,
        liveViewUrl: session.liveViewUrl,
        sessionId: session.sessionId,
        sourceUrl: session.sourceUrl,
        status: session.status,
        timeoutSeconds: session.timeoutSeconds,
        title: session.title,
      });
    };

    const poll = async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/browserbase/live-session/${encodeURIComponent(toolCallId)}`,
        { cache: "no-store" }
      ).catch(() => null);

      if (!response || response.status === 202) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      const body = (await response.json()) as BrowserbaseLiveSessionResponse;

      if (body.status !== "ready" || !isMounted) {
        return false;
      }

      openLiveSession(body.session);
      return true;
    };

    poll().then((isReady) => {
      if (isReady || !isMounted) {
        return;
      }

      intervalId = setInterval(() => {
        poll().then((ready) => {
          if (ready && intervalId) {
            clearInterval(intervalId);
          }
        });
      }, 1000);
    });

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setBrowserPanel, toolCallId]);

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 font-medium text-sm">
        <MonitorIcon className="size-4" />
        Browserbaseブラウザ操作
      </div>
      <p className="mb-3 text-muted-foreground text-xs">
        遠隔ブラウザを起動しています。準備でき次第、右側にライブ画面を表示します。
      </p>
      {liveSession ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              setBrowserPanel({
                isVisible: true,
                liveViewUrl: liveSession.liveViewUrl,
                sessionId: liveSession.sessionId,
                sourceUrl: liveSession.sourceUrl,
                status: liveSession.status,
                timeoutSeconds: liveSession.timeoutSeconds,
                title: liveSession.title,
              })
            }
            size="sm"
            type="button"
          >
            右側で表示
            <Maximize2Icon className="size-3.5" />
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={liveSession.liveViewUrl} rel="noreferrer" target="_blank">
              新規タブ
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="size-2 animate-pulse rounded-full bg-blue-500" />
          Live View URLを待機中
        </div>
      )}
    </div>
  );
}

function DeepResearchToolResult({ result }: { result: unknown }) {
  const { setBrowserPanel } = useBrowserPanel();

  if (!isRecord(result)) {
    return <ToolOutput errorText={undefined} output={result} />;
  }

  const output = result as DeepResearchToolOutput;
  const searches =
    output.rounds?.flatMap((round) => round.searches ?? []) ?? [];
  const results = searches
    .flatMap((search) =>
      (search.results ?? []).map((item) => ({
        ...item,
        query: search.query,
      }))
    )
    .filter((item) => item.url && item.title)
    .slice(0, 8);
  const errors = [
    output.error,
    ...searches.map((search) => search.error).filter(Boolean),
  ].filter(Boolean);
  const openResearchPanel = () => {
    setBrowserPanel({
      isVisible: true,
      mode: "research",
      title: output.initialQuery
        ? `${output.initialQuery} のリサーチ`
        : "Deep Research",
      research: {
        initialQuery: output.initialQuery,
        isLoading: false,
        plan: buildResearchPlan({
          query: output.initialQuery,
          maxRounds: 5,
          parallelSearches: 5,
          resultsPerQuery: 5,
        }),
        rounds: output.rounds,
        summary: output.summary,
      },
    });
  };

  return (
    <ToolOutput
      errorText={undefined}
      output={
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <SearchIcon className="size-4" />
              Deep Research
            </div>
            {output.initialQuery && (
              <p className="text-muted-foreground text-xs">
                検索テーマ: {output.initialQuery}
              </p>
            )}
          </div>

          <Button onClick={openResearchPanel} size="sm" type="button">
            右側で検索連鎖を表示
            <Maximize2Icon className="size-3.5" />
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground text-[11px]">Rounds</div>
              <div className="font-semibold text-sm">
                {output.summary?.totalRounds ?? output.rounds?.length ?? 0}
              </div>
            </div>
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground text-[11px]">Searches</div>
              <div className="font-semibold text-sm">
                {output.summary?.totalSearches ?? searches.length}
              </div>
            </div>
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground text-[11px]">Sources</div>
              <div className="font-semibold text-sm">
                {output.summary?.totalUniqueResults ?? results.length}
              </div>
            </div>
          </div>

          {output.summary?.stoppedByRateLimit && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
              Brave Searchのレート制限に到達したため、追加検索を停止しました。
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          )}

          {searches.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Queries
              </div>
              <div className="flex flex-wrap gap-1.5">
                {searches.map((search) => (
                  <span
                    className="rounded-full border bg-muted/40 px-2 py-1 text-xs"
                    key={search.query}
                  >
                    {search.query}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <GlobeIcon className="size-4" />
                参照ソース
              </div>
              <div className="space-y-2">
                {results.map((result) => (
                  <a
                    className="block rounded-md border bg-background p-3 transition-colors hover:bg-muted/40"
                    href={result.url}
                    key={result.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-medium text-sm">
                          {result.title}
                        </div>
                        {result.description && (
                          <div className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                            {result.description}
                          </div>
                        )}
                        <div className="mt-2 truncate text-muted-foreground text-[11px]">
                          {result.query}
                        </div>
                      </div>
                      <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {output.summary?.suggestedFollowUpQueries &&
            output.summary.suggestedFollowUpQueries.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Follow-up
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {output.summary.suggestedFollowUpQueries.map((query) => (
                    <span
                      className="rounded-full border bg-muted/40 px-2 py-1 text-xs"
                      key={query}
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      }
    />
  );
}

function DeepResearchPlanPreview({ input }: { input: unknown }) {
  const { setBrowserPanel } = useBrowserPanel();
  const parsedInput = isRecord(input) ? (input as DeepResearchToolInput) : {};
  const query = parsedInput.query;
  const maxRounds = parsedInput.maxRounds;
  const parallelSearches = parsedInput.parallelSearches;
  const resultsPerQuery = parsedInput.resultsPerQuery;
  const plan = useMemo(
    () =>
      buildResearchPlan({
        query,
        maxRounds,
        parallelSearches,
        resultsPerQuery,
      }),
    [query, maxRounds, parallelSearches, resultsPerQuery]
  );

  useEffect(() => {
    setBrowserPanel({
      isVisible: true,
      mode: "research",
      title: plan.title,
      research: {
        initialQuery: query,
        isLoading: true,
        plan,
        rounds: [],
      },
    });
  }, [query, plan, setBrowserPanel]);

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 font-medium text-sm">
        <SearchIcon className="size-4" />
        リサーチ計画
      </div>
      <p className="mb-3 text-muted-foreground text-xs">
        5件検索して、結果から次の5クエリを生成する流れを5回繰り返します。
        右側パネルで進行を表示しています。
      </p>
      <div className="space-y-1.5">
        {plan.steps.slice(0, 3).map((step) => (
          <div className="flex gap-2 text-xs" key={step}>
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UniqloToolResult({ result }: { result: unknown }) {
  const { setBrowserPanel } = useBrowserPanel();

  if (!isRecord(result)) {
    return <ToolOutput errorText={undefined} output={result} />;
  }

  const output = result as UniqloToolOutput;
  const liveViewUrl =
    output.browserbase?.liveViewUrl ?? output.browserbase?.debuggerUrl;
  const products = output.products ?? [];
  const openBrowserPanel = () => {
    if (!liveViewUrl) {
      return;
    }

    setBrowserPanel({
      isVisible: true,
      liveViewUrl,
      sessionId: output.browserbase?.sessionId,
      sourceUrl: output.searchUrl,
      status: output.status,
      timeoutSeconds: output.browserbase?.timeoutSeconds,
      title: "UNIQLO Browserbase Live View",
    });
  };

  return (
    <ToolOutput
      errorText={undefined}
      output={
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium text-sm">
              {output.status ?? "UNIQLO search result"}
            </div>
            {output.message && (
              <p className="text-muted-foreground text-xs">{output.message}</p>
            )}
          </div>

          {liveViewUrl ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 font-medium text-sm">
                <MonitorIcon className="size-4" />
                Browserbaseブラウザ操作
              </div>
              <p className="mb-3 text-muted-foreground text-xs">
                遠隔ブラウザの画面をリアルタイムで確認できます。
                セッションは最大{output.browserbase?.timeoutSeconds ?? 600}
                秒で終了します。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={openBrowserPanel} size="sm" type="button">
                  右側で表示
                  <Maximize2Icon className="size-3.5" />
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={liveViewUrl} rel="noreferrer" target="_blank">
                    新規タブ
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ) : output.browserbase?.debugError ? (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
              BrowserbaseライブビューURLを取得できませんでした:{" "}
              {output.browserbase.debugError}
            </div>
          ) : null}

          {products.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <ShoppingBagIcon className="size-4" />
                商品候補
              </div>
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    className="rounded-md border bg-background p-3"
                    key={`${product.name}-${product.url}`}
                  >
                    <div className="font-medium text-sm">
                      {product.name ?? "UNIQLO product"}
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {[product.price, product.reason]
                        .filter(Boolean)
                        .join(" / ")}
                    </div>
                    {product.url && (
                      <a
                        className="mt-2 inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
                        href={product.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        商品ページを開く
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {output.searchUrl && (
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-xs underline-offset-4 hover:underline"
              href={output.searchUrl}
              rel="noreferrer"
              target="_blank"
            >
              UNIQLO検索ページを開く
              <ExternalLinkIcon className="size-3" />
            </a>
          )}

          {output.purchaseBoundary && (
            <p className="text-muted-foreground text-xs">
              {output.purchaseBoundary}
            </p>
          )}
        </div>
      }
    />
  );
}

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages: _setMessages,
  regenerate: _regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" && part.text?.trim().length > 0) ||
      (part.type === "reasoning" &&
        "text" in part &&
        part.text?.trim().length > 0) ||
      part.type.startsWith("tool-")
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const attachments = attachmentsFromMessage.length > 0 && (
    <div
      className="flex flex-row justify-end gap-2"
      data-testid={"message-attachments"}
    >
      {attachmentsFromMessage.map((attachment) => (
        <PreviewAttachment
          attachment={{
            name: attachment.filename ?? "file",
            contentType: attachment.mediaType,
            url: attachment.url,
          }}
          key={attachment.url}
        />
      ))}
    </div>
  );

  const mergedReasoning = message.parts?.reduce(
    (acc, part) => {
      if (part.type === "reasoning" && part.text?.trim().length > 0) {
        return {
          text: acc.text ? `${acc.text}\n\n${part.text}` : part.text,
          isStreaming: "state" in part ? part.state === "streaming" : false,
          rendered: false,
        };
      }
      return acc;
    },
    { text: "", isStreaming: false, rendered: false }
  ) ?? { text: "", isStreaming: false, rendered: false };

  const parts = message.parts?.map((part, index) => {
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === "reasoning") {
      if (!mergedReasoning.rendered && mergedReasoning.text) {
        mergedReasoning.rendered = true;
        return (
          <MessageReasoning
            isLoading={isLoading || mergedReasoning.isStreaming}
            key={key}
            reasoning={mergedReasoning.text}
          />
        );
      }
      return null;
    }

    if (type === "text") {
      return (
        <MessageContent
          className={cn("text-[13px] leading-[1.65]", {
            "w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 shadow-[var(--shadow-card)]":
              message.role === "user",
          })}
          data-testid="message-content"
          key={key}
        >
          <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
        </MessageContent>
      );
    }

    if (type === "tool-getWeather") {
      const { toolCallId, state } = part;
      const approvalId = (part as { approval?: { id: string } }).approval?.id;
      const isDenied =
        state === "output-denied" ||
        (state === "approval-responded" &&
          (part as { approval?: { approved?: boolean } }).approval?.approved ===
            false);
      const widthClass = "w-[min(100%,450px)]";

      if (state === "output-available") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Weather weatherAtLocation={part.output} />
          </div>
        );
      }

      if (isDenied) {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state="output-denied" type="tool-getWeather" />
              <ToolContent>
                <div className="px-4 py-3 text-muted-foreground text-sm">
                  Weather lookup was denied.
                </div>
              </ToolContent>
            </Tool>
          </div>
        );
      }

      if (state === "approval-responded") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state={state} type="tool-getWeather" />
              <ToolContent>
                <ToolInput input={part.input} />
              </ToolContent>
            </Tool>
          </div>
        );
      }

      return (
        <div className={widthClass} key={toolCallId}>
          <Tool className="w-full" defaultOpen={true}>
            <ToolHeader state={state} type="tool-getWeather" />
            <ToolContent>
              {(state === "input-available" ||
                state === "approval-requested") && (
                <ToolInput input={part.input} />
              )}
              {state === "approval-requested" && approvalId && (
                <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                  <button
                    className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      addToolApprovalResponse({
                        id: approvalId,
                        approved: false,
                        reason: "User denied weather lookup",
                      });
                    }}
                    type="button"
                  >
                    Deny
                  </button>
                  <button
                    className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                    onClick={() => {
                      addToolApprovalResponse({
                        id: approvalId,
                        approved: true,
                      });
                    }}
                    type="button"
                  >
                    Allow
                  </button>
                </div>
              )}
            </ToolContent>
          </Tool>
        </div>
      );
    }

    if (type === "tool-createDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error creating document: {String(part.output.error)}
          </div>
        );
      }

      return (
        <DocumentPreview
          isReadonly={isReadonly}
          key={toolCallId}
          result={part.output}
        />
      );
    }

    if (type === "tool-deepResearch") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,640px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader
            state={state}
            title="Deep Research"
            type="tool-deepResearch"
          />
          <ToolContent>
            {(state === "input-available" ||
              state === "approval-requested") && (
              <>
                <ToolInput input={part.input} />
                {state === "input-available" && (
                  <DeepResearchPlanPreview input={part.input} />
                )}
              </>
            )}
            {state === "output-available" && (
              <DeepResearchToolResult result={part.output} />
            )}
            {state === "output-error" && (
              <ToolOutput errorText={part.errorText} output={undefined} />
            )}
          </ToolContent>
        </Tool>
      );
    }

    if (type === "tool-updateDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error updating document: {String(part.output.error)}
          </div>
        );
      }

      return (
        <div className="relative" key={toolCallId}>
          <DocumentPreview
            args={{ ...part.output, isUpdate: true }}
            isReadonly={isReadonly}
            result={part.output}
          />
        </div>
      );
    }

    if (type === "tool-requestSuggestions") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,450px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader state={state} type="tool-requestSuggestions" />
          <ToolContent>
            {state === "input-available" && <ToolInput input={part.input} />}
            {state === "output-available" && (
              <ToolOutput
                errorText={undefined}
                output={
                  "error" in part.output ? (
                    <div className="rounded border p-2 text-red-500">
                      Error: {String(part.output.error)}
                    </div>
                  ) : (
                    <DocumentToolResult
                      isReadonly={isReadonly}
                      result={part.output}
                      type="request-suggestions"
                    />
                  )
                }
              />
            )}
          </ToolContent>
        </Tool>
      );
    }

    if (type === "tool-shopUniqlo") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,560px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader
            state={state}
            title="UNIQLO shopping assistant"
            type="tool-shopUniqlo"
          />
          <ToolContent>
            {(state === "input-available" ||
              state === "approval-requested") && (
              <>
                <ToolInput input={part.input} />
                {state === "input-available" && (
                  <BrowserbaseRunningPreview toolCallId={toolCallId} />
                )}
              </>
            )}
            {state === "output-available" && (
              <UniqloToolResult result={part.output} />
            )}
            {state === "output-error" && (
              <ToolOutput errorText={part.errorText} output={undefined} />
            )}
          </ToolContent>
        </Tool>
      );
    }

    return null;
  });

  const actions = !isReadonly && (
    <MessageActions
      chatId={chatId}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={onEdit ? () => onEdit(message) : undefined}
      vote={vote}
    />
  );

  const content = isThinking ? (
    <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
      <Shimmer className="font-medium" duration={1}>
        Thinking...
      </Shimmer>
    </div>
  ) : (
    <>
      {attachments}
      {parts}
      {actions}
    </>
  );

  return (
    <div
      className={cn(
        "group/message w-full",
        !isAssistant && "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3"
        )}
      >
        {isAssistant && (
          <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon size={13} />
          </div>
        </div>

        <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
          <Shimmer className="font-medium" duration={1}>
            Thinking...
          </Shimmer>
        </div>
      </div>
    </div>
  );
};
