import { tool } from "ai";
import { type Browser, chromium, type Page } from "playwright-core";
import { z } from "zod";
import { setBrowserbaseLiveSession } from "@/lib/browserbase/live-sessions";

const browserbaseSessionsUrl = "https://api.browserbase.com/v1/sessions";
const browserbaseSessionTimeoutSeconds = 600;
const browserbaseLivePreviewWarmupMs = 3000;

const uniqloRegions = {
  jp: {
    label: "UNIQLO Japan",
    searchBaseUrl: "https://www.uniqlo.com/jp/ja/search",
    defaultQuery: "白 Tシャツ",
    currency: "JPY",
  },
  us: {
    label: "UNIQLO US",
    searchBaseUrl: "https://www.uniqlo.com/us/en/search",
    defaultQuery: "white t-shirt",
    currency: "USD",
  },
} as const;

type UniqloRegion = keyof typeof uniqloRegions;

type BrowserbaseSession = {
  id?: string;
  connectUrl?: string;
};

type BrowserbaseLiveViewLinks = {
  debuggerFullscreenUrl?: string;
  debuggerUrl?: string;
  wsUrl?: string;
  pages?: Array<{
    id?: string;
    url?: string;
    title?: string;
    debuggerUrl?: string;
    debuggerFullscreenUrl?: string;
  }>;
};

export type UniqloProductCandidate = {
  name: string;
  price?: string;
  url: string;
  reason: string;
  score: number;
};

type ExtractedProductLink = {
  href: string;
  text: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildUniqloSearchUrl({
  query,
  region,
}: {
  query: string;
  region: UniqloRegion;
}) {
  const url = new URL(uniqloRegions[region].searchBaseUrl);
  url.searchParams.set("q", query);
  return url.toString();
}

function findPrice(text: string) {
  return text.match(/(?:¥|￥|\$)\s?[\d,]+(?:\.\d{2})?/)?.[0];
}

function toProductName(text: string) {
  const [firstLine] = normalizeText(text)
    .split(/(?:¥|￥|\$)\s?[\d,]+(?:\.\d{2})?/)
    .map((line) => line.trim())
    .filter(Boolean);

  return firstLine?.slice(0, 120) || "UNIQLO product";
}

export function rankUniqloProduct({
  product,
  query,
  size,
  maxPrice,
}: {
  product: ExtractedProductLink;
  query: string;
  size?: string;
  maxPrice?: number;
}) {
  const text = normalizeText(product.text);
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (/t[-\s]?shirt|tシャツ|ティーシャツ/i.test(text)) {
    score += 5;
    reasons.push("Tシャツ候補");
  }

  if (/白|ホワイト|white/i.test(text)) {
    score += 4;
    reasons.push("白/ホワイト表記あり");
  }

  for (const token of lowerQuery.split(/\s+/).filter(Boolean)) {
    if (lowerText.includes(token)) {
      score += 1;
    }
  }

  if (size && lowerText.includes(size.toLowerCase())) {
    score += 1;
    reasons.push(`サイズ ${size} の表記あり`);
  }

  const price = findPrice(text);
  if (price && maxPrice) {
    const numericPrice = Number(price.replace(/[^\d.]/g, ""));
    if (Number.isFinite(numericPrice) && numericPrice <= maxPrice) {
      score += 1;
      reasons.push(`予算 ${maxPrice} 以内の可能性`);
    }
  }

  return {
    name: toProductName(text),
    price,
    url: product.href,
    reason: reasons.join(" / ") || "検索結果から抽出",
    score,
  };
}

export function chooseUniqloProducts({
  links,
  query,
  maxResults,
  size,
  maxPrice,
}: {
  links: ExtractedProductLink[];
  query: string;
  maxResults: number;
  size?: string;
  maxPrice?: number;
}) {
  const seen = new Set<string>();

  return links
    .filter((link) => {
      if (seen.has(link.href)) {
        return false;
      }
      seen.add(link.href);
      return link.href.includes("uniqlo.com") && normalizeText(link.text);
    })
    .map((product) => rankUniqloProduct({ product, query, size, maxPrice }))
    .filter((product) => product.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

async function createBrowserbaseSession(apiKey: string) {
  const response = await fetch(browserbaseSessionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BB-API-Key": apiKey,
    },
    body: JSON.stringify({
      keepAlive: true,
      proxies: true,
      timeout: browserbaseSessionTimeoutSeconds,
      userMetadata: {
        app: "ai-agent-taiyo",
        tool: "shopUniqlo",
      },
    }),
  });

  if (!response.ok) {
    return {
      error: `Browserbase session creation failed: ${response.status} ${response.statusText}`,
    };
  }

  return {
    session: (await response.json()) as BrowserbaseSession,
  };
}

async function getBrowserbaseLiveViewLinks(
  session: BrowserbaseSession,
  apiKey: string
) {
  if (!session.id) {
    return {
      error: "Browserbase session response did not include an id.",
    };
  }

  const response = await fetch(
    `${browserbaseSessionsUrl}/${session.id}/debug`,
    {
      headers: {
        "X-BB-API-Key": apiKey,
      },
    }
  );

  if (!response.ok) {
    return {
      error: `Browserbase live view URL request failed: ${response.status} ${response.statusText}`,
    };
  }

  return {
    links: (await response.json()) as BrowserbaseLiveViewLinks,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConnectUrl(session: BrowserbaseSession, apiKey: string) {
  if (session.connectUrl) {
    return session.connectUrl;
  }

  if (!session.id) {
    throw new Error("Browserbase session response did not include an id.");
  }

  return `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey)}&sessionId=${encodeURIComponent(session.id)}`;
}

async function dismissCommonPrompts(page: Page) {
  const labels = [/同意|許可|閉じる|OK/i, /accept|agree|allow|close|got it/i];

  for (const label of labels) {
    await page
      .getByRole("button", { name: label })
      .click({ timeout: 1500 })
      .catch(() => undefined);
  }
}

function extractProductLinks(page: Page) {
  return page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/products/"], a[href*="/item/"], a[href*="/goods/"]'
      )
    );

    return anchors.map((anchor) => {
      const container =
        anchor.closest("article, li, [data-testid], [class*=product]") ??
        anchor;
      const href = new URL(anchor.href, window.location.href).toString();
      const text = (container.textContent ?? anchor.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();

      return { href, text };
    });
  });
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

async function extractProductLinksFromHtml(searchUrl: string) {
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
  });

  if (!response.ok) {
    return {
      error: `UNIQLO search page request failed: ${response.status} ${response.statusText}`,
    };
  }

  const html = await response.text();
  const links: ExtractedProductLink[] = [];
  const anchorPattern =
    /<a\b[^>]*href=(["'])([^"']*(?:\/products\/|\/item\/|\/goods\/)[^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  match = anchorPattern.exec(html);
  while (match && links.length < 80) {
    const href = decodeHtmlEntities(match[2]);
    const text = normalizeText(stripHtml(match[3]));

    if (!text) {
      match = anchorPattern.exec(html);
      continue;
    }

    links.push({
      href: new URL(href, searchUrl).toString(),
      text,
    });

    match = anchorPattern.exec(html);
  }

  return { links };
}

export const shopUniqlo = tool({
  description:
    "Use Browserbase to search UNIQLO for a white T-shirt, expose a Browserbase live view URL, and return product candidates. This tool must not log in, pay, place an order, or click final purchase/checkout confirmation buttons.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Search query, for example '白 Tシャツ' or 'white t-shirt'.")
      .optional(),
    region: z
      .enum(["jp", "us"])
      .describe("UNIQLO region to search. Use jp for Japan and us for the US.")
      .default("jp"),
    size: z.string().describe("Preferred size such as S, M, L, XL.").optional(),
    gender: z
      .enum(["mens", "womens", "kids", "any"])
      .describe("Preferred category. Use any when unspecified.")
      .default("any"),
    maxPrice: z
      .number()
      .positive()
      .describe("Optional max price in the selected region's local currency.")
      .optional(),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(5)
      .describe("Number of product candidates to return.")
      .default(3),
  }),
  execute: async (
    { query, region, size, gender, maxPrice, maxResults },
    { toolCallId }
  ) => {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const selectedRegion = uniqloRegions[region];
    const searchQuery = query?.trim() || selectedRegion.defaultQuery;
    const searchUrl = buildUniqloSearchUrl({ query: searchQuery, region });

    if (!apiKey) {
      const htmlResult = await extractProductLinksFromHtml(searchUrl);
      if ("error" in htmlResult) {
        return {
          status: "configuration_required",
          message:
            "BROWSERBASE_API_KEY is not configured, and the fallback UNIQLO HTML search failed.",
          fallbackError: htmlResult.error,
          searchUrl,
        };
      }

      const products = chooseUniqloProducts({
        links: htmlResult.links,
        query: searchQuery,
        maxResults,
        size,
        maxPrice,
      });

      return {
        status:
          products.length > 0
            ? "fallback_candidates_found"
            : "fallback_no_candidates",
        message:
          "BROWSERBASE_API_KEY is not configured, so this used UNIQLO's public search HTML as a fallback.",
        region,
        regionLabel: selectedRegion.label,
        currency: selectedRegion.currency,
        query: searchQuery,
        gender,
        size,
        maxPrice,
        searchUrl,
        products,
        purchaseBoundary:
          "候補検索まで完了しました。ログイン、配送先入力、支払い、注文確定はユーザーがUNIQLO上で確認して実行してください。",
      };
    }

    const sessionResult = await createBrowserbaseSession(apiKey);
    if ("error" in sessionResult) {
      return {
        status: "browserbase_error",
        message: sessionResult.error,
        searchUrl,
      };
    }

    const browserbaseSession = sessionResult.session;
    const liveViewResult = await getBrowserbaseLiveViewLinks(
      browserbaseSession,
      apiKey
    );
    const liveViewLinks =
      "links" in liveViewResult ? liveViewResult.links : undefined;
    const browserbase = liveViewLinks
      ? {
          sessionId: browserbaseSession.id,
          liveViewUrl:
            liveViewLinks.debuggerFullscreenUrl ?? liveViewLinks.debuggerUrl,
          debuggerUrl: liveViewLinks.debuggerUrl,
          pages: liveViewLinks.pages,
          keepAlive: true,
          timeoutSeconds: browserbaseSessionTimeoutSeconds,
        }
      : {
          sessionId: browserbaseSession.id,
          debugError: liveViewResult.error,
          keepAlive: true,
          timeoutSeconds: browserbaseSessionTimeoutSeconds,
        };

    if ("liveViewUrl" in browserbase && browserbase.liveViewUrl) {
      setBrowserbaseLiveSession(toolCallId, {
        liveViewUrl: browserbase.liveViewUrl,
        sessionId: browserbase.sessionId,
        sourceUrl: searchUrl,
        status: "running",
        timeoutSeconds: browserbase.timeoutSeconds,
        title: "UNIQLO Browserbase Live View",
      });

      await wait(browserbaseLivePreviewWarmupMs);
    }

    let browser: Browser | undefined;

    try {
      browser = await chromium.connectOverCDP(
        getConnectUrl(browserbaseSession, apiKey)
      );

      const context = browser.contexts()[0] ?? (await browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());

      page.setDefaultTimeout(15_000);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await dismissCommonPrompts(page);
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);

      const links = await extractProductLinks(page);
      const products = chooseUniqloProducts({
        links,
        query: searchQuery,
        maxResults,
        size,
        maxPrice,
      });

      return {
        status: products.length > 0 ? "candidates_found" : "no_candidates",
        browserbase,
        region,
        regionLabel: selectedRegion.label,
        currency: selectedRegion.currency,
        query: searchQuery,
        gender,
        size,
        maxPrice,
        searchUrl,
        products,
        purchaseBoundary:
          "候補検索まで完了しました。ログイン、配送先入力、支払い、注文確定はユーザーがUNIQLO上で確認して実行してください。",
      };
    } catch (error) {
      return {
        status: "automation_error",
        browserbase,
        message:
          error instanceof Error
            ? error.message
            : "UNIQLO automation failed for an unknown reason.",
        searchUrl,
      };
    } finally {
      await browser?.close().catch(() => undefined);
    }
  },
});
