import "server-only";

import { Codex, type SandboxMode } from "@openai/codex-sdk";
import type { ChatMessage } from "../types";
import { getTextFromMessage } from "../utils";
import { CODEX_LOCAL_MODEL_ID } from "./models";

const DEFAULT_CODEX_MODEL = "gpt-5.4";
const DEFAULT_SANDBOX: SandboxMode = "read-only";

export function isCodexLocalModel(modelId: string) {
  return modelId === CODEX_LOCAL_MODEL_ID;
}

function getCodexSandboxMode(): SandboxMode {
  const configured = process.env.CODEX_LOCAL_SANDBOX;

  if (
    configured === "read-only" ||
    configured === "workspace-write" ||
    configured === "danger-full-access"
  ) {
    return configured;
  }

  return DEFAULT_SANDBOX;
}

function getCodexEnv() {
  if (!process.env.CODEX_LOCAL_CODEX_HOME) {
    return undefined;
  }

  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
    CODEX_HOME: process.env.CODEX_LOCAL_CODEX_HOME,
  };
}

function buildCodexPrompt(messages: ChatMessage[]) {
  const transcript = messages
    .map((message) => {
      const text = getTextFromMessage(message).trim();
      if (!text) {
        return null;
      }
      return `${message.role.toUpperCase()}:\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    "You are being controlled from the AI-Agent-Taiyo local chat UI.",
    "Answer the latest user request directly. Do not edit files unless the latest user request explicitly asks for code or filesystem changes.",
    "If you cannot run because authentication or local configuration is missing, explain the exact local setup step needed.",
    "",
    transcript,
  ].join("\n");
}

export async function runCodexLocal(messages: ChatMessage[]) {
  if (process.env.CODEX_LOCAL_MODE_ENABLED !== "1") {
    return [
      "Codex Local is disabled.",
      "",
      "To use ChatGPT subscription-backed Codex from this app, run `codex login` locally, then set `CODEX_LOCAL_MODE_ENABLED=1` in `.env.local` and restart the dev server.",
      "This mode is intended for trusted local development only; it does not convert the public web app's AI Gateway usage into ChatGPT subscription usage.",
    ].join("\n");
  }

  const codex = new Codex({
    env: getCodexEnv(),
  });
  const thread = codex.startThread({
    approvalPolicy: "never",
    model: process.env.CODEX_LOCAL_MODEL || DEFAULT_CODEX_MODEL,
    networkAccessEnabled: process.env.CODEX_LOCAL_NETWORK === "1",
    sandboxMode: getCodexSandboxMode(),
    skipGitRepoCheck: true,
    workingDirectory: process.env.CODEX_LOCAL_WORKDIR || process.cwd(),
  });
  const result = await thread.run(buildCodexPrompt(messages));

  return (
    result.finalResponse ||
    "Codex completed the turn but did not return a final response."
  );
}
