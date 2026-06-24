import { openCodexLogin } from "@/lib/ai/codex-cli";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function POST() {
  if (!isDevelopmentEnvironment) {
    return Response.json(
      {
        started: false,
        message: "Codex local login is only available in development.",
      },
      { status: 403 }
    );
  }

  try {
    const result = await openCodexLogin();

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        started: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to start Codex login.",
      },
      { status: 500 }
    );
  }
}
