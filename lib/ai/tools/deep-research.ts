import { tool } from "ai";
import { z } from "zod";

const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_MAX_ROUNDS = 5;
const DEFAULT_PARALLEL_SEARCHES = 5;
const DEFAULT_RESULTS_PER_QUERY = 5;
const REQUEST_TIMEOUT_MS = 12_000;
const REQUEST_SPACING_MS = 1500;

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "analysis",
  "and",
  "because",
  "before",
  "best",
  "brave",
  "could",
  "deep",
  "does",
  "from",
  "have",
  "into",
  "latest",
  "more",
  "news",
  "official",
  "overview",
  "research",
  "search",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

type BraveSearchResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  extra_snippets?: string[];
};

type BraveSearchResponse = {
  query?: {
    original?: string;
    more_results_available?: boolean;
  };
  web?: {
    results?: BraveSearchResult[];
  };
};

type BraveErrorResponse = {
  error?: {
    detail?: string;
    meta?: {
      errors?: Array<{
        loc?: string[];
        msg?: string;
      }>;
    };
  };
};

type ResearchResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
  extraSnippets: string[];
};

type SearchExecution = {
  query: string;
  results: ResearchResult[];
  error?: string;
  isRateLimited?: boolean;
};

type ResearchRound = {
  round: number;
  queries: string[];
  searches: SearchExecution[];
  gapsFromInitialQuery: string[];
  nextQueries: string[];
};

function getBraveSearchApiKey() {
  return process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function normalizeCountry(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || !/^[a-z]{2}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeSearchLanguage(value?: string) {
  const normalized = value?.trim().toLowerCase().replace("_", "-");

  if (!normalized) {
    return undefined;
  }

  const languageAliases: Record<string, string> = {
    ja: "jp",
    "ja-jp": "jp",
    "en-us": "en",
  };

  return languageAliases[normalized] ?? normalized;
}

async function readBraveErrorMessage(response: Response) {
  const data = (await response
    .json()
    .catch(() => null)) as BraveErrorResponse | null;
  const validationMessage = data?.error?.meta?.errors
    ?.map((error) =>
      [error.loc?.join("."), error.msg].filter(Boolean).join(": ")
    )
    .filter(Boolean)
    .join("; ");

  return data?.error?.detail
    ? [data.error.detail, validationMessage].filter(Boolean).join(" ")
    : validationMessage;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeQuery(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function collectSearchText(result: ResearchResult) {
  return [result.title, result.description, ...result.extraSnippets].join(" ");
}

function extractTerms(value: string) {
  const terms = value.match(/[\p{L}\p{N}][\p{L}\p{N}'-]{2,}/gu) ?? [];

  return terms
    .map((term) => term.toLowerCase().replace(/^['-]+|['-]+$/g, ""))
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

function candidateSearchQueries(query: string, maxQueries: number) {
  return uniqueValues([
    query,
    `${query} overview`,
    `${query} latest`,
    `${query} comparison`,
    `${query} challenges`,
    `${query} expert analysis`,
  ]).slice(0, maxQueries);
}

export function extractQueryGaps(
  initialQuery: string,
  results: ResearchResult[],
  maxGaps = 8
) {
  const queryTerms = new Set(extractTerms(initialQuery));
  const scores = new Map<string, number>();

  for (const result of results) {
    const titleTerms = new Set(extractTerms(result.title));

    for (const term of extractTerms(collectSearchText(result))) {
      if (queryTerms.has(term)) {
        continue;
      }

      scores.set(
        term,
        (scores.get(term) ?? 0) + (titleTerms.has(term) ? 3 : 1)
      );
    }
  }

  return [...scores.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, maxGaps)
    .map(([term]) => term);
}

export function buildNextQueries(
  initialQuery: string,
  gaps: string[],
  searchedQueries: Set<string>,
  maxQueries: number
) {
  return uniqueValues(
    gaps.flatMap((gap) => [`${initialQuery} ${gap}`, `${gap} ${initialQuery}`])
  )
    .filter((query) => !searchedQueries.has(normalizeQuery(query)))
    .slice(0, maxQueries);
}

function normalizeBraveResults(results: BraveSearchResult[] = []) {
  return results.flatMap((result) => {
    if (!result.url || !result.title) {
      return [];
    }

    const normalizedResult: ResearchResult = {
      title: stripHtml(result.title),
      url: result.url,
      description: stripHtml(result.description ?? ""),
      extraSnippets: (result.extra_snippets ?? []).map(stripHtml),
    };

    if (result.age) {
      normalizedResult.age = result.age;
    }

    return [normalizedResult];
  });
}

async function braveSearch({
  apiKey,
  query,
  count,
  country,
  searchLanguage,
}: {
  apiKey: string;
  query: string;
  count: number;
  country?: string;
  searchLanguage?: string;
}) {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  const normalizedCountry = normalizeCountry(country);
  const normalizedSearchLanguage = normalizeSearchLanguage(searchLanguage);

  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("extra_snippets", "true");

  if (normalizedCountry) {
    url.searchParams.set("country", normalizedCountry);
  }

  if (normalizedSearchLanguage) {
    url.searchParams.set("search_lang", normalizedSearchLanguage);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const isRateLimited = response.status === 429;
    const errorMessage = isRateLimited
      ? undefined
      : await readBraveErrorMessage(response);
    return {
      query,
      results: [],
      error: isRateLimited
        ? "Brave Search rate limit reached. Search was stopped to avoid repeated 429 errors."
        : `Brave Search returned ${response.status}${
            errorMessage ? `: ${errorMessage}` : ""
          }`,
      isRateLimited,
    } satisfies SearchExecution;
  }

  const data = (await response.json()) as BraveSearchResponse;

  return {
    query,
    results: normalizeBraveResults(data.web?.results),
  } satisfies SearchExecution;
}

async function runSearchesSequentially({
  apiKey,
  queries,
  count,
  country,
  searchLanguage,
}: {
  apiKey: string;
  queries: string[];
  count: number;
  country?: string;
  searchLanguage?: string;
}) {
  const searches: SearchExecution[] = [];

  for (const [index, roundQuery] of queries.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
    }

    try {
      const search = await braveSearch({
        apiKey,
        query: roundQuery,
        count,
        country,
        searchLanguage,
      });

      searches.push(search);

      if (search.isRateLimited) {
        break;
      }
    } catch (error) {
      searches.push({
        query: roundQuery,
        results: [],
        error:
          error instanceof Error
            ? error.message
            : "Brave Search request failed",
      });
    }
  }

  return searches;
}

export const deepResearch = tool({
  description:
    "Run conservative web research with Brave Search. Use this when the user asks for web search, latest/current information, research, source discovery, or broad investigation. To avoid Brave Search rate limits, the app serializes requests and caps the number of searches unless explicitly configured by environment variables.",
  inputSchema: z.object({
    query: z.string().min(1).describe("The user's original research query."),
    maxRounds: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(DEFAULT_MAX_ROUNDS)
      .describe(
        "Maximum iterative research rounds. The app may lower this to avoid search rate limits."
      ),
    parallelSearches: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(DEFAULT_PARALLEL_SEARCHES)
      .describe(
        "Maximum Brave Search queries per round. The app runs them sequentially and may lower this to avoid rate limits."
      ),
    resultsPerQuery: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(DEFAULT_RESULTS_PER_QUERY)
      .describe("Number of Brave web results to request for each query."),
    country: z
      .string()
      .length(2)
      .optional()
      .describe(
        "Optional 2-letter country code for Brave Search, e.g. US or JP."
      ),
    searchLanguage: z
      .string()
      .min(2)
      .max(10)
      .optional()
      .describe(
        "Optional search language code. Japanese values like ja or ja-JP are normalized to Brave Search's jp code."
      ),
  }),
  execute: async ({ query, country, searchLanguage }) => {
    const apiKey = getBraveSearchApiKey();

    if (!apiKey) {
      return {
        error:
          "BRAVE_SEARCH_API_KEY or BRAVE_API_KEY is required to use deepResearch.",
      };
    }

    const searchedQueries = new Set<string>();
    const seenUrls = new Set<string>();
    const rounds: ResearchRound[] = [];
    const maxConfiguredRounds = clamp(
      readPositiveInteger(
        process.env.DEEP_RESEARCH_MAX_ROUNDS,
        DEFAULT_MAX_ROUNDS
      ),
      1,
      5
    );
    const maxConfiguredSearchesPerRound = clamp(
      readPositiveInteger(
        process.env.DEEP_RESEARCH_SEARCHES_PER_ROUND,
        DEFAULT_PARALLEL_SEARCHES
      ),
      1,
      5
    );
    const effectiveMaxRounds = maxConfiguredRounds;
    const effectiveSearchesPerRound = maxConfiguredSearchesPerRound;
    const effectiveResultsPerQuery = DEFAULT_RESULTS_PER_QUERY;
    let currentQueries = candidateSearchQueries(
      query,
      effectiveSearchesPerRound
    );
    let latestGaps: string[] = [];
    let stoppedByRateLimit = false;

    for (
      let round = 1;
      round <= effectiveMaxRounds && currentQueries.length > 0;
      round++
    ) {
      const roundQueries = currentQueries
        .filter((currentQuery) => {
          const normalized = normalizeQuery(currentQuery);

          if (searchedQueries.has(normalized)) {
            return false;
          }

          searchedQueries.add(normalized);
          return true;
        })
        .slice(0, effectiveSearchesPerRound);

      if (roundQueries.length === 0) {
        break;
      }

      const searches = await runSearchesSequentially({
        apiKey,
        queries: roundQueries,
        count: effectiveResultsPerQuery,
        country,
        searchLanguage,
      });
      stoppedByRateLimit = searches.some((search) => search.isRateLimited);

      const newResults = searches.flatMap((search) =>
        search.results.filter((result) => {
          if (seenUrls.has(result.url)) {
            return false;
          }

          seenUrls.add(result.url);
          return true;
        })
      );
      latestGaps = extractQueryGaps(query, newResults);
      const nextQueries = buildNextQueries(
        query,
        latestGaps,
        searchedQueries,
        effectiveSearchesPerRound
      );

      rounds.push({
        round,
        queries: roundQueries,
        searches,
        gapsFromInitialQuery: latestGaps,
        nextQueries,
      });

      if (stoppedByRateLimit) {
        break;
      }

      currentQueries = nextQueries;
    }

    return {
      initialQuery: query,
      rounds,
      summary: {
        totalRounds: rounds.length,
        totalSearches: searchedQueries.size,
        totalUniqueResults: seenUrls.size,
        stoppedByRateLimit,
        latestGapsFromInitialQuery: latestGaps,
        suggestedFollowUpQueries:
          rounds.at(-1)?.nextQueries ??
          buildNextQueries(
            query,
            latestGaps,
            searchedQueries,
            effectiveSearchesPerRound
          ),
      },
    };
  },
});
