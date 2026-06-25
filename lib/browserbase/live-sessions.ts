export type BrowserbaseLiveSession = {
  toolCallId: string;
  title: string;
  liveViewUrl: string;
  sessionId?: string;
  sourceUrl?: string;
  status?: string;
  timeoutSeconds?: number;
  updatedAt: number;
};

const browserbaseLiveSessionTtlMs = 15 * 60 * 1000;

type BrowserbaseLiveSessionStore = Map<string, BrowserbaseLiveSession>;

const globalForBrowserbaseLiveSessions = globalThis as typeof globalThis & {
  browserbaseLiveSessions?: BrowserbaseLiveSessionStore;
};

const liveSessions =
  globalForBrowserbaseLiveSessions.browserbaseLiveSessions ?? new Map();

globalForBrowserbaseLiveSessions.browserbaseLiveSessions = liveSessions;

function pruneLiveSessions() {
  const now = Date.now();

  for (const [toolCallId, session] of liveSessions) {
    if (now - session.updatedAt > browserbaseLiveSessionTtlMs) {
      liveSessions.delete(toolCallId);
    }
  }
}

export function setBrowserbaseLiveSession(
  toolCallId: string | undefined,
  session: Omit<BrowserbaseLiveSession, "toolCallId" | "updatedAt">
) {
  if (!toolCallId) {
    return;
  }

  pruneLiveSessions();

  liveSessions.set(toolCallId, {
    ...session,
    toolCallId,
    updatedAt: Date.now(),
  });
}

export function getBrowserbaseLiveSession(toolCallId: string) {
  pruneLiveSessions();
  return liveSessions.get(toolCallId) ?? null;
}
