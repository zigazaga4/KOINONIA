import { createMiddleware } from "hono/factory";

const API_KEY = process.env.API_KEY;

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }

  const token = authHeader.slice(7);

  if (token !== API_KEY) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  await next();
});
