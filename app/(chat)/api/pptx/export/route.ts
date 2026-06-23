import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  fileName: z.string().min(1).max(120),
  html: z
    .string()
    .min(1)
    .max(500_000)
    .refine((value) => /class=(["'])[^"']*\bslide\b[^"']*\1/.test(value), {
      message: "HTMLには .slide クラスの要素が必要です。",
    }),
});

type ExportJob = {
  downloadUrl?: string;
  error?: string;
  fileBase64?: string;
  jobId?: string;
  message?: string;
  mimeType?: string;
  status?: "queued" | "processing" | "completed" | "failed" | string;
};

export const maxDuration = 60;

function normalizeFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.pptx$/i, "");
  const safeName = withoutExtension.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${safeName || "html-generated-deck"}.pptx`;
}

function getApiBaseUrl() {
  return (process.env.HTML2PPTX_BASE_URL || "https://html2pptx.app").replace(
    /\/$/,
    ""
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJobResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as ExportJob | null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `html2pptx.app API request failed: ${response.status}`;
    throw new Error(message);
  }

  if (!data) {
    throw new Error("html2pptx.app APIから空のレスポンスが返りました。");
  }

  return data;
}

async function pollJob({
  apiBaseUrl,
  apiKey,
  jobId,
}: {
  apiBaseUrl: string;
  apiKey: string;
  jobId: string;
}) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(attempt === 0 ? 1000 : 2000);

    const response = await fetch(`${apiBaseUrl}/api/export/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const job = await readJobResponse(response);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(
        job.message || job.error || "PowerPoint変換に失敗しました。"
      );
    }
  }

  throw new Error("PowerPoint変換がタイムアウトしました。");
}

async function loadPptxBytes(job: ExportJob) {
  if (job.fileBase64) {
    return Buffer.from(job.fileBase64, "base64");
  }

  if (!job.downloadUrl) {
    throw new Error("PowerPointファイルの取得URLが見つかりません。");
  }

  const response = await fetch(job.downloadUrl);

  if (!response.ok) {
    throw new Error(
      `PowerPointファイルの取得に失敗しました: ${response.status}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function POST(request: Request) {
  const apiKey = process.env.HTML2PPTX_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "HTML2PPTX_API_KEY が未設定です。html2pptx.appのAPIキーを環境変数に設定してください。",
      },
      { status: 500 }
    );
  }

  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors.map((item) => item.message).join(", ")
        : "リクエスト本文が不正です。";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const fileName = normalizeFileName(parsed.fileName);
  const apiBaseUrl = getApiBaseUrl();

  try {
    const createResponse = await fetch(`${apiBaseUrl}/api/export/jobs`, {
      body: JSON.stringify({
        autoEmbedFonts: false,
        fileName,
        height: 7.5,
        html: parsed.html,
        metadata: {
          channel: "ai-agent-taiyo",
          source: "html-pptx-tool",
        },
        responseFormat: "both",
        width: 13.333,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    });
    const createdJob = await readJobResponse(createResponse);

    if (!createdJob.jobId) {
      throw new Error("html2pptx.app APIからjobIdが返りませんでした。");
    }

    const completedJob = await pollJob({
      apiBaseUrl,
      apiKey,
      jobId: createdJob.jobId,
    });
    const bytes = await loadPptxBytes(completedJob);

    return new Response(bytes, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type":
          completedJob.mimeType ||
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PowerPoint出力中にエラーが発生しました。",
      },
      { status: 502 }
    );
  }
}
