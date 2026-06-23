import { initBotId } from "botid/client/core";

if (process.env.NEXT_PUBLIC_DISABLE_BOTID !== "1") {
  initBotId({
    protect: [
      {
        path: "/api/chat",
        method: "POST",
      },
    ],
  });
}
