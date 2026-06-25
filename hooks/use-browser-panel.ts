"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";

export type BrowserPanelData = {
  title: string;
  liveViewUrl?: string;
  sessionId?: string;
  sourceUrl?: string;
  status?: string;
  timeoutSeconds?: number;
  mode?: "browser" | "research";
  research?: {
    initialQuery?: string;
    isLoading?: boolean;
    plan?: {
      title: string;
      steps: string[];
      rounds: number;
      searchesPerRound: number;
      resultsPerQuery: number;
    };
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
      gapsFromInitialQuery?: string[];
      nextQueries?: string[];
    }>;
    summary?: {
      totalRounds?: number;
      totalSearches?: number;
      totalUniqueResults?: number;
      stoppedByRateLimit?: boolean;
      suggestedFollowUpQueries?: string[];
    };
  };
  isVisible: boolean;
};

export const initialBrowserPanelData: BrowserPanelData = {
  title: "",
  isVisible: false,
};

type Selector<T> = (state: BrowserPanelData) => T;

export function useBrowserPanelSelector<Selected>(
  selector: Selector<Selected>
) {
  const { data: localBrowserPanel } = useSWR<BrowserPanelData>(
    "browser-panel",
    null,
    {
      fallbackData: initialBrowserPanelData,
    }
  );

  return useMemo(
    () => selector(localBrowserPanel ?? initialBrowserPanelData),
    [localBrowserPanel, selector]
  );
}

export function useBrowserPanel() {
  const { data: localBrowserPanel, mutate: setLocalBrowserPanel } =
    useSWR<BrowserPanelData>("browser-panel", null, {
      fallbackData: initialBrowserPanelData,
    });

  const browserPanel = useMemo(
    () => localBrowserPanel ?? initialBrowserPanelData,
    [localBrowserPanel]
  );

  const setBrowserPanel = useCallback(
    (
      updaterFn:
        | BrowserPanelData
        | ((currentPanel: BrowserPanelData) => BrowserPanelData)
    ) => {
      setLocalBrowserPanel((currentPanel) => {
        const panelToUpdate = currentPanel ?? initialBrowserPanelData;

        if (typeof updaterFn === "function") {
          return updaterFn(panelToUpdate);
        }

        return updaterFn;
      });
    },
    [setLocalBrowserPanel]
  );

  const closeBrowserPanel = useCallback(() => {
    setLocalBrowserPanel((currentPanel) => ({
      ...(currentPanel ?? initialBrowserPanelData),
      isVisible: false,
    }));
  }, [setLocalBrowserPanel]);

  return useMemo(
    () => ({
      browserPanel,
      closeBrowserPanel,
      setBrowserPanel,
    }),
    [browserPanel, closeBrowserPanel, setBrowserPanel]
  );
}
