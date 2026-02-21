import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import { logger } from "./logger.js";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const LEGACY_API_KEY = process.env.API_KEY;

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }

  const token = authHeader.slice(7);

  // Legacy: accept static API key during migration period
  if (LEGACY_API_KEY && token === LEGACY_API_KEY) {
    c.set("userId", null);
    await next();
    return;
  }

  // JWT verification
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub;
    if (!userId) {
      return c.json({ error: "Invalid token: no subject" }, 401);
    }
    c.set("userId", userId);
    await next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err}`);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
