import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CODEX_DEVICE_AUTH_URL = "https://auth.openai.com/codex/device";

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
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AI_GATEWAY_API_KEY: undefined,
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

  if (output.includes("Missing OpenAI API key")) {
    return "ChatGPT login is not connected yet. Press the button to open the Codex login page; the one-time code will be copied to your clipboard.";
  }

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
  const command = `${getCodexHomeEnvPrefix()}env -u AI_GATEWAY_API_KEY pnpm exec codex login --device-auth`;

  if (process.platform !== "darwin") {
    return {
      started: false,
      message: "Run this command in your local terminal.",
      command,
    };
  }

  const autoOpenAndCopy = [
    "while IFS= read -r line; do",
    '  if printf "%s\\n" "$line" | grep -q "https://auth.openai.com/codex/device"; then',
    `    open ${shellQuote(CODEX_DEVICE_AUTH_URL)}`,
    "  fi",
    '  code=$(printf "%s\\n" "$line" | grep -Eo "[A-Z0-9]{4}-[A-Z0-9]{4}" | head -1)',
    '  if [ -n "$code" ]; then',
    '    printf "%s" "$code" | pbcopy',
    '    osascript -e \'display notification "One-time code copied to clipboard" with title "Codex login"\'',
    "  fi",
    "done",
  ].join("; ");

  const script = [
    `cd ${shellQuote(process.cwd())}`,
    `${command} 2>&1 | tee >(${autoOpenAndCopy})`,
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
