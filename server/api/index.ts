import { Hono } from "hono";
import { cors } from "hono/cors";
import bible from "./bible.js";
import chat from "./chat.js";

const api = new Hono();

api.use("*", cors());

api.route("/api/bible", bible);
api.route("/api/chat", chat);

api.get("/api/health", (c) => c.json({ status: "ok" }));

export default api;
