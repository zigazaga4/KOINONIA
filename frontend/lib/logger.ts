/**
 * Structured frontend logger — mirrors server Winston format.
 * Native: writes to device filesystem (expo-file-system) in session directories.
 * Web: console output + in-memory buffer.
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  meta?: Record<string, unknown>;
};

const MAX_ENTRIES = 500;
const logBuffer: LogEntry[] = [];
let minLevel: LogLevel = __DEV__ ? "debug" : "info";

// --- Session directory setup (native only) ---

const logsRoot =
  Platform.OS !== "web" && FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}logs/`
    : null;

function makeSessionTimestamp(): string {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
}

let sessionDir: string | null = null;
let fileReady = false;

async function ensureSessionDir() {
  if (!logsRoot || sessionDir) return;

  sessionDir = `${logsRoot}${makeSessionTimestamp()}/`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(logsRoot);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(logsRoot, { intermediates: true });
    }
    await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });
    fileReady = true;
  } catch (e) {
    console.warn("[logger] Failed to create session dir", e);
    sessionDir = null;
    fileReady = false;
  }
}

// Kick off directory creation immediately on native
if (logsRoot) {
  ensureSessionDir();
}

/** Get the current session log directory (native only) */
export function getSessionLogDir(): string | null {
  return sessionDir;
}

// --- File writing (native only) ---

// Queue writes to avoid concurrent appendToFile calls
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(filePath: string, content: string) {
  writeQueue = writeQueue.then(async () => {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        const existing = await FileSystem.readAsStringAsync(filePath);
        await FileSystem.writeAsStringAsync(filePath, existing + content);
      } else {
        await FileSystem.writeAsStringAsync(filePath, content);
      }
    } catch {
      // Silently fail — don't break the app for logging
    }
  });
}

function writeToFile(line: string, level: LogLevel) {
  if (!fileReady || !sessionDir) return;

  // app.log — all levels
  enqueueWrite(`${sessionDir}app.log`, line + "\n");

  // error.log — errors only
  if (level === "error") {
    enqueueWrite(`${sessionDir}error.log`, line + "\n");
  }
}

// --- Timestamp helpers ---

function fullTimestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}`;
}

function shortTimestamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

// --- Core emit ---

function emit(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const ts = shortTimestamp();
  const entry: LogEntry = { timestamp: ts, level, tag, message, meta };

  logBuffer.push(entry);
  if (logBuffer.length > MAX_ENTRIES) logBuffer.shift();

  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";

  // Console output (short timestamp, like server console transport)
  const consoleLine = `${ts} [${level.toUpperCase()}] [${tag}] ${message}${metaStr}`;
  switch (level) {
    case "debug":
      console.debug(consoleLine);
      break;
    case "info":
      console.log(consoleLine);
      break;
    case "warn":
      console.warn(consoleLine);
      break;
    case "error":
      console.error(consoleLine);
      break;
  }

  // File output (full timestamp, like server file transport)
  const fileLine = `[${fullTimestamp()}] [${level.toUpperCase()}] [${tag}] ${message}${metaStr}`;
  writeToFile(fileLine, level);
}

// --- Public API ---

/** Create a tagged logger instance */
export function createLogger(tag: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", tag, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", tag, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", tag, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", tag, msg, meta),
  };
}

/** Get recent log entries from memory buffer */
export function getRecentLogs(count = 100): LogEntry[] {
  return logBuffer.slice(-count);
}

/** Set minimum log level */
export function setLogLevel(level: LogLevel) {
  minLevel = level;
}

/** List all session log directories (native only) */
export async function listLogSessions(): Promise<string[]> {
  if (!logsRoot) return [];
  try {
    const dirInfo = await FileSystem.getInfoAsync(logsRoot);
    if (!dirInfo.exists) return [];
    return await FileSystem.readDirectoryAsync(logsRoot);
  } catch {
    return [];
  }
}

/** Read a log file from a session (native only) */
export async function readLogFile(
  sessionName: string,
  file: "app.log" | "error.log"
): Promise<string | null> {
  if (!logsRoot) return null;
  try {
    const path = `${logsRoot}${sessionName}/${file}`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path);
  } catch {
    return null;
  }
}

/** Delete old log sessions, keeping the N most recent */
export async function pruneLogSessions(keep = 10): Promise<number> {
  if (!logsRoot) return 0;
  try {
    const sessions = await listLogSessions();
    sessions.sort();
    const toDelete = sessions.slice(0, Math.max(0, sessions.length - keep));
    for (const dir of toDelete) {
      await FileSystem.deleteAsync(`${logsRoot}${dir}`, { idempotent: true });
    }
    return toDelete.length;
  } catch {
    return 0;
  }
}
