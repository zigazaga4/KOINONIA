import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { SignJWT } from "jose";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
});

export const createApiToken = action({
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the actual Convex user table ID (not the tokenIdentifier)
    const userId = await ctx.runQuery(internal.subscriptions.resolveUserId);

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return token;
  },
});
