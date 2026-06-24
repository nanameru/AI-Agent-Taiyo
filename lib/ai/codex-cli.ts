import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ExecError = Error & {
  code?: number | string;
  killed?: boolean;
  signal?: NodeJS.Signals;
  stderr?: string;
  stdout?: string;
};

export type CodexCliStatus = {
  connected: boolean;
  message: string;
  details?: string;
};

function getCodexEnv() {
  const env = {
    ...process.env,
  };

  if (process.env.CODEX_LOCAL_CODEX_HOME) {
    env.CODEX_HOME = process.env.CODEX_LOCAL_CODEX_HOME;
  }

  return env;
}

function getCodexHomeEnvPrefix() {
  if (!process.env.CODEX_LOCAL_CODEX_HOME) {
    return "";
  }

  return `CODEX_HOME=${shellQuote(process.env.CODEX_LOCAL_CODEX_HOME)} `;
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function summarizeError(error: ExecError) {
  const output = [error.stdout, error.stderr, error.message]
    .filter(Boolean)
    .join("\n")
    .trim();

  return output || "Codex CLI command failed.";
}

export async function getCodexLoginStatus(): Promise<CodexCliStatus> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "pnpm",
      ["exec", "codex", "login", "status"],
      {
        cwd: process.cwd(),
        env: getCodexEnv(),
        timeout: 10_000,
      }
    );

    const details = [stdout, stderr].filter(Boolean).join("\n").trim();

    return {
      connected: true,
      message: "Codex is connected to ChatGPT.",
      ...(details && { details }),
    };
  } catch (error) {
    const details = summarizeError(error as ExecError);

    return {
      connected: false,
      message: "Codex is not connected to ChatGPT.",
      details,
    };
  }
}

export async function openCodexLogin() {
  const command = `${getCodexHomeEnvPrefix()}pnpm exec codex login --device-auth`;

  if (process.platform !== "darwin") {
    return {
      started: false,
      message: "Run this command in your local terminal.",
      command,
    };
  }

  const script = [
    `cd ${shellQuote(process.cwd())}`,
    command,
    "echo",
    "echo 'Codex login finished. You can close this window.'",
  ].join("; ");

  await execFileAsync("osascript", [
    "-e",
    'tell application "Terminal" to activate',
    "-e",
    `tell application "Terminal" to do script ${JSON.stringify(script)}`,
  ]);

  return {
    started: true,
    message: "Opened Terminal for ChatGPT Codex login.",
    command,
  };
}
