import { getAppSession } from "@/app/(auth)/session";
import { getBrowserbaseLiveSession } from "@/lib/browserbase/live-sessions";
import { ChatbotError } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ toolCallId: string }> }
) {
  const session = await getAppSession();

  if (!session?.user) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const { toolCallId } = await params;
  const liveSession = getBrowserbaseLiveSession(toolCallId);

  if (!liveSession) {
    return Response.json({ status: "pending" }, { status: 202 });
  }

  return Response.json({ status: "ready", session: liveSession });
}
