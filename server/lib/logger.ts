import winston from "winston";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");

const logsRoot = join(__dirname, "..", "logs");
const sessionDir = join(logsRoot, timestamp);

mkdirSync(sessionDir, { recursive: true });

export const sessionLogDir = sessionDir;

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    })
  ),
  transports: [
    // Console (clean, colored)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
    // Server log file
    new winston.transports.File({
      filename: join(sessionDir, "server.log"),
    }),
    // Convex output log file
    new winston.transports.File({
      filename: join(sessionDir, "convex.log"),
      level: "debug",
    }),
    // Error-only log file
    new winston.transports.File({
      filename: join(sessionDir, "error.log"),
      level: "error",
    }),
  ],
});
