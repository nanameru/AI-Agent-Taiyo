if (process.env.NEXT_PUBLIC_DISABLE_BOTID !== "1") {
  import("botid/client/core")
    .then(({ initBotId }) =>
      initBotId({
        protect: [
          {
            path: "/api/chat",
            method: "POST",
          },
        ],
      })
    )
    .catch((error) => {
      console.error("Failed to initialize BotID", error);
    });
}
