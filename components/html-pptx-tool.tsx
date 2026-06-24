"use client";

import {
  Download,
  FileCode2,
  FileText,
  Loader2,
  PanelRight,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const basePrompt =
  "AIエージェント活用の社内提案。目的、効果、導入ステップ、次のアクションを4枚で整理する。";

const defaultHtml = createDeckHtml(basePrompt);

type SlidePreview = {
  html: string;
  index: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toDeckTitle(prompt: string) {
  const firstLine = prompt
    .split(/\n|。|\./)
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || "HTML to PowerPoint").slice(0, 34);
}

function toKeywords(prompt: string) {
  const normalized = prompt
    .replace(/[、。,.]/g, "\n")
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const fallback = ["目的の明確化", "価値の可視化", "実行計画", "意思決定"];
  return [...normalized, ...fallback].slice(0, 4);
}

function createDeckHtml(prompt: string) {
  const title = escapeHtml(toDeckTitle(prompt));
  const keywords = toKeywords(prompt).map(escapeHtml);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f0ea; font-family: Arial, "Hiragino Sans", "Yu Gothic", sans-serif; }
    .slide { width: 1600px; height: 900px; margin: 0; overflow: hidden; position: relative; color: #141414; }
    .label { letter-spacing: 0.12em; text-transform: uppercase; font-size: 24px; color: #8b4f2b; white-space: nowrap; }
    .title { font-size: 82px; line-height: 1.12; font-weight: 800; letter-spacing: 0; white-space: nowrap; min-width: 1120px; }
    .body { font-size: 32px; line-height: 1.55; color: #3a3a35; }
    .num { font-size: 112px; font-weight: 800; white-space: nowrap; min-width: 260px; display: inline-block; }
    .pill { border: 2px solid #141414; border-radius: 999px; padding: 18px 30px; font-size: 26px; font-weight: 700; white-space: nowrap; display: inline-flex; min-width: 260px; justify-content: center; }
  </style>
</head>
<body>
  <section class="slide" style="background:#f6f1e8;">
    <div style="position:absolute;left:90px;top:72px;width:1420px;height:756px;">
      <div style="position:absolute;right:0;top:0;width:360px;height:360px;border:36px solid #0f766e;border-radius:50%;"></div>
      <div style="position:absolute;right:210px;bottom:40px;width:540px;height:36px;background:#c7a35a;transform:rotate(-8deg);"></div>
      <div class="label" style="position:absolute;left:0;top:20px;width:520px;">HTML generated deck</div>
      <h1 class="title" style="position:absolute;left:0;top:190px;width:1120px;">${title}</h1>
      <p class="body" style="position:absolute;left:0;top:455px;width:900px;">入力したテーマから、PowerPoint変換に向いた固定サイズのHTMLスライドを生成します。</p>
      <div class="pill" style="position:absolute;left:0;bottom:20px;width:320px;">16:9 editable PPTX</div>
    </div>
  </section>
  <section class="slide" style="background:#10201f;color:#f7f3ea;">
    <div style="position:absolute;left:86px;top:70px;width:1428px;height:760px;">
      <div class="label" style="color:#d2ad62;width:520px;">Focus map</div>
      <h2 style="font-size:64px;line-height:1.18;font-weight:800;width:900px;white-space:nowrap;margin:62px 0 0;">押さえるべき4つの論点</h2>
      <div style="display:grid;grid-template-columns:620px 620px;gap:34px;position:absolute;left:0;top:260px;">
        ${keywords
          .map(
            (
              keyword,
              index
            ) => `<div style="height:188px;border:1px solid rgba(247,243,234,.28);background:rgba(247,243,234,.07);padding:34px 38px;">
          <div style="font-size:22px;color:#d2ad62;white-space:nowrap;min-width:120px;">0${index + 1}</div>
          <div style="font-size:36px;font-weight:800;margin-top:24px;white-space:nowrap;min-width:520px;">${keyword}</div>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>
  <section class="slide" style="background:#fbfbf7;">
    <div style="position:absolute;left:90px;top:74px;width:1420px;height:752px;">
      <div class="label" style="width:440px;">Execution rhythm</div>
      <h2 style="font-size:64px;line-height:1.18;font-weight:800;width:980px;white-space:nowrap;margin:54px 0 0;">HTMLからPPTXまでの流れ</h2>
      <div style="position:absolute;left:0;top:282px;width:1350px;height:320px;border-top:4px solid #141414;">
        <div style="position:absolute;left:0;top:-18px;width:36px;height:36px;background:#b86a2d;border-radius:50%;"></div>
        <div style="position:absolute;left:410px;top:-18px;width:36px;height:36px;background:#0f766e;border-radius:50%;"></div>
        <div style="position:absolute;left:820px;top:-18px;width:36px;height:36px;background:#c7a35a;border-radius:50%;"></div>
        <div style="position:absolute;left:1230px;top:-18px;width:36px;height:36px;background:#141414;border-radius:50%;"></div>
        <div style="display:flex;gap:58px;padding-top:66px;">
          <div style="width:300px;"><div class="num">1</div><div class="body" style="width:300px;">テーマを入力</div></div>
          <div style="width:300px;"><div class="num">2</div><div class="body" style="width:300px;">HTMLを生成</div></div>
          <div style="width:300px;"><div class="num">3</div><div class="body" style="width:300px;">縦プレビュー確認</div></div>
          <div style="width:300px;"><div class="num">4</div><div class="body" style="width:300px;">PPTXを保存</div></div>
        </div>
      </div>
    </div>
  </section>
  <section class="slide" style="background:#e8eee9;">
    <div style="position:absolute;left:90px;top:72px;width:1420px;height:756px;">
      <div style="position:absolute;right:0;top:0;width:500px;height:756px;background:#141414;"></div>
      <div class="label" style="width:380px;">Next action</div>
      <h2 style="font-size:72px;line-height:1.18;font-weight:800;width:820px;white-space:nowrap;margin:70px 0 0;">PowerPointで仕上げる</h2>
      <p class="body" style="width:770px;margin-top:48px;">出力後もテキストや図形を編集できるため、レビューや社内共有にそのまま進めます。</p>
      <div class="pill" style="position:absolute;left:0;bottom:42px;width:360px;background:#0f766e;color:#fff;border-color:#0f766e;">Download PPTX</div>
      <div style="position:absolute;right:76px;top:120px;width:350px;color:#f7f3ea;">
        <div style="font-size:26px;color:#d2ad62;white-space:nowrap;width:260px;">Editable objects</div>
        <div style="font-size:118px;font-weight:800;margin-top:80px;white-space:nowrap;min-width:300px;">.pptx</div>
        <div style="font-size:30px;line-height:1.5;width:330px;">HTMLとCSSの見た目を、編集可能なPowerPointへ。</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}

function extractSlides(html: string): SlidePreview[] {
  const styles = Array.from(html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi))
    .map((match) => match[0])
    .join("\n");
  const slidePattern =
    /<(section|div)\b(?=[^>]*class=(["'])[^"']*\bslide\b[^"']*\2)[^>]*>[\s\S]*?<\/\1>/gi;

  return Array.from(html.matchAll(slidePattern)).map((match, index) => ({
    html: `<!doctype html><html><head><meta charset="utf-8" />${styles}<style>html,body{margin:0;width:1600px;height:900px;overflow:hidden;background:#f4f1ea}.slide{margin:0!important}</style></head><body>${match[0]}</body></html>`,
    index,
  }));
}

function safeFileName(value: string) {
  const trimmed = value.trim().replace(/\.pptx$/i, "");
  const fallback = "html-generated-deck";
  return `${(trimmed || fallback).replace(/[^a-zA-Z0-9._-]/g, "-")}.pptx`;
}

export function HtmlPptxTool() {
  const [prompt, setPrompt] = useState(basePrompt);
  const [fileName, setFileName] = useState("html-generated-deck.pptx");
  const [html, setHtml] = useState(defaultHtml);
  const [isExporting, setIsExporting] = useState(false);

  const slides = useMemo(() => extractSlides(html), [html]);

  const generateHtml = () => {
    const nextHtml = createDeckHtml(prompt);
    setHtml(nextHtml);
    toast.success("HTMLを生成しました");
  };

  const downloadPptx = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/pptx/export`,
        {
          body: JSON.stringify({ fileName: safeFileName(fileName), html }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "PowerPoint出力に失敗しました");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeFileName(fileName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("PowerPointをダウンロードしました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PowerPoint出力に失敗しました"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#f4f1ea] text-[#161616]">
      <div className="grid min-h-dvh grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col px-4 py-4 md:px-7 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-[#161616]/15 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[#8b4f2b] text-xs uppercase tracking-[0.18em]">
                <FileCode2 className="size-4" />
                HTML to editable PowerPoint
              </div>
              <h1 className="mt-2 font-semibold text-2xl tracking-normal md:text-4xl">
                HTML生成とPowerPoint出力
              </h1>
            </div>
            <Button
              className="bg-[#0f766e] hover:bg-[#0b5f59]"
              disabled={isExporting || slides.length === 0}
              onClick={downloadPptx}
              size="lg"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download />
              )}
              PowerPointをダウンロード
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 py-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col gap-4">
              <div className="rounded-lg border border-[#161616]/15 bg-[#fffdfa] p-4 shadow-sm">
                <label
                  className="font-medium text-[#4d4b45] text-sm"
                  htmlFor="deck-prompt"
                >
                  生成テーマ
                </label>
                <Textarea
                  className="mt-2 min-h-36 resize-y rounded-lg bg-white"
                  id="deck-prompt"
                  onChange={(event) => setPrompt(event.target.value)}
                  value={prompt}
                />
                <Button className="mt-3 w-full" onClick={generateHtml}>
                  <WandSparkles />
                  HTMLを生成
                </Button>
              </div>

              <div className="rounded-lg border border-[#161616]/15 bg-[#fffdfa] p-4 shadow-sm">
                <label
                  className="font-medium text-[#4d4b45] text-sm"
                  htmlFor="deck-file-name"
                >
                  ファイル名
                </label>
                <Input
                  className="mt-2 rounded-lg bg-white"
                  id="deck-file-name"
                  onChange={(event) => setFileName(event.target.value)}
                  value={fileName}
                />
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-[#161616]/10 bg-[#efe8dc] p-3">
                    <div className="font-mono text-[#8b4f2b] text-xs">
                      slides
                    </div>
                    <div className="mt-1 font-semibold text-2xl">
                      {slides.length}
                    </div>
                  </div>
                  <div className="rounded-md border border-[#161616]/10 bg-[#e8eee9] p-3">
                    <div className="font-mono text-[#0f766e] text-xs">
                      format
                    </div>
                    <div className="mt-1 font-semibold text-2xl">16:9</div>
                  </div>
                </div>
              </div>
            </aside>

            <section className="flex min-h-[520px] flex-col rounded-lg border border-[#161616]/15 bg-[#101716] shadow-sm">
              <div className="flex items-center justify-between border-white/10 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-[#d2ad62] text-xs uppercase tracking-[0.16em]">
                  <FileText className="size-4" />
                  HTML source
                </div>
                <span className="text-[#f5efe4]/60 text-xs">section.slide</span>
              </div>
              <Textarea
                className="min-h-[520px] flex-1 resize-none rounded-none border-0 bg-[#101716] px-4 py-4 font-mono text-[#f5efe4] text-xs leading-5 focus-visible:ring-0 md:text-xs"
                onChange={(event) => setHtml(event.target.value)}
                spellCheck={false}
                value={html}
              />
            </section>
          </div>
        </section>

        <aside className="max-h-dvh overflow-y-auto border-[#161616]/15 border-t bg-[#ded8cc] px-4 py-5 xl:border-t-0 xl:border-l">
          <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-[#161616]/15 border-b bg-[#ded8cc]/95 px-4 pb-4 backdrop-blur">
            <div className="flex items-center gap-2 font-mono text-[#5b4b3e] text-xs uppercase tracking-[0.16em]">
              <PanelRight className="size-4" />
              Visualize
            </div>
            <span className="text-[#5b4b3e] text-sm">縦プレビュー</span>
          </div>

          <div className="flex flex-col gap-4">
            {slides.length > 0 ? (
              slides.map((slide) => (
                <div className="group" key={slide.index}>
                  <div className="mb-2 flex items-center justify-between text-[#5b4b3e] text-xs">
                    <span className="font-mono">
                      slide {String(slide.index + 1).padStart(2, "0")}
                    </span>
                    <span>1600 x 900</span>
                  </div>
                  <div className="aspect-video overflow-hidden rounded-md border border-[#161616]/20 bg-white shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <iframe
                      className="h-[900px] w-[1600px] origin-top-left scale-[0.24] border-0"
                      sandbox=""
                      srcDoc={slide.html}
                      title={`slide ${slide.index + 1}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-[#161616]/15 bg-[#fffdfa] p-5 text-[#5b4b3e] text-sm">
                `.slide` クラスを持つHTMLが見つかりません。
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
