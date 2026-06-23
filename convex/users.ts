import { mutation, query } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

export const upsertCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const user = {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      issuer: identity.issuer,
      email: identity.email,
      name: identity.name,
      image: identity.pictureUrl,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, user);
      return existing._id;
    }

    return await ctx.db.insert("users", user);
  },
});
