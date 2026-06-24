import { getCodexLoginStatus } from "@/lib/ai/codex-cli";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function GET() {
  if (!isDevelopmentEnvironment) {
    return Response.json(
      {
        connected: false,
        message: "Codex local login is only available in development.",
      },
      { status: 403 }
    );
  }

  const status = await getCodexLoginStatus();

  return Response.json(status);
}
