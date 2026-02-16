import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Dynamic imports so dotenv loads BEFORE the Anthropic SDK initializes
const { spawn } = await import("child_process");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");
const { serve } = await import("@hono/node-server");
const { default: api } = await import("./api/index.js");
const { logger, sessionLogDir } = await import("./lib/logger.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_PORT = Number(process.env.API_PORT) || 3141;

logger.info(`Koinonia server starting`);
logger.info(`Log directory: ${sessionLogDir}`);

// Start Bible API server (bind to 0.0.0.0 so localhost works on all platforms)
const server = serve({ fetch: api.fetch, port: API_PORT, hostname: "0.0.0.0" }, () => {
  logger.info(`Bible API server running on http://localhost:${API_PORT}`);
});

// Start Convex dev server
const convexBin = join(__dirname, "node_modules", ".bin", "convex");

const convex = spawn(convexBin, ["dev"], {
  cwd: __dirname,
  stdio: ["inherit", "pipe", "pipe"],
});

convex.stdout.on("data", (data: Buffer) => {
  const text = data.toString();
  process.stdout.write(text);
  const clean = text.trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  if (clean) logger.debug(clean);
});

convex.stderr.on("data", (data: Buffer) => {
  const text = data.toString();
  process.stderr.write(text);
  const clean = text.trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  if (!clean) return;
  // Convex prints normal status messages to stderr — only log actual errors as errors
  const isRealError = clean.toLowerCase().includes("error") ||
                      clean.toLowerCase().includes("failed") ||
                      clean.toLowerCase().includes("exception");
  if (isRealError) {
    logger.error(clean);
  } else {
    logger.info(clean);
  }
});

convex.on("close", (code) => {
  logger.info(`Convex dev server stopped (exit code: ${code})`);
  server.close();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  logger.info("Shutting down...");
  server.close();
  convex.kill("SIGINT");
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  server.close();
  convex.kill("SIGTERM");
});
