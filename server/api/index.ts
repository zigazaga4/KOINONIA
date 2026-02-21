import { Hono } from "hono";
import { cors } from "hono/cors";
import bible from "./bible.js";
import chat from "./chat.js";
import stripeRouter from "./stripe.js";

const api = new Hono();

api.use("*", cors());

api.route("/api/bible", bible);
api.route("/api/chat", chat);
api.route("/api/stripe", stripeRouter);

api.get("/api/health", (c) => c.json({ status: "ok" }));

export default api;
