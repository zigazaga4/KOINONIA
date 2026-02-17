// Bun automatically loads .env.local

const { spawn } = await import("child_process");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");
const { default: api } = await import("./api/index.js");
const { logger, sessionLogDir } = await import("./lib/logger.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_PORT = Number(process.env.API_PORT) || 3141;

logger.info(`Koinonia server starting`);
logger.info(`Log directory: ${sessionLogDir}`);

// Start Bible API server using Bun's native serve
const server = Bun.serve({
  port: API_PORT,
  hostname: "0.0.0.0",
  fetch: api.fetch,
});
logger.info(`Bible API server running on http://localhost:${server.port}`);

// Start Convex dev server
const convexBin = join(__dirname, "node_modules", ".bin", "convex");

const convex = spawn(convexBin, ["dev"], {
  cwd: __dirname,
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

convex.stdout!.on("data", (data: Buffer) => {
  const text = data.toString();
  process.stdout.write(text);
  const clean = text.trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  if (clean) logger.debug(clean);
});

convex.stderr!.on("data", (data: Buffer) => {
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
  if (code !== 0) {
    logger.warn("Convex dev server failed — API server is still running. Run 'npx convex dev' separately if needed.");
  }
});

process.on("SIGINT", () => {
  logger.info("Shutting down...");
  server.stop();
  convex.kill("SIGINT");
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  server.stop();
  convex.kill("SIGTERM");
});
