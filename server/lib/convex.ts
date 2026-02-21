import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("CONVEX_URL not set");
}

export const convexClient = new ConvexHttpClient(CONVEX_URL);
