import { app } from "./app.js";
import { env } from "./config/env.js";
import { createServer } from "node:http";
import { attachSocketServer } from "./realtime/socket.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3000;
// Keep the Node upstream below Hostinger's 120-entry-process quota even when
// the reverse proxy opens many concurrent connections.
server.maxConnections = 50;
server.requestTimeout = env.REQUEST_TIMEOUT_MS;
server.headersTimeout = env.REQUEST_TIMEOUT_MS + 5000;
server.keepAliveTimeout = 5000;
const io = attachSocketServer(server);
const databaseTarget = new URL(env.DATABASE_URL);
const processDetails = () => ({
  pid: process.pid,
  ppid: process.ppid,
  node: process.version,
  execPath: process.execPath,
  argv: process.argv,
  cwd: process.cwd(),
  uptime: Number(process.uptime().toFixed(3)),
  memory: process.memoryUsage(),
});
console.log("PROCESS_START_DIAGNOSTIC", {
  pid: process.pid,
  ppid: process.ppid,
  node: process.version,
  execPath: process.execPath,
  argv: process.argv,
  cwd: process.cwd(),
  port: PORT,
  timestamp: new Date().toISOString(),
});
logger.info({ databaseHost: databaseTarget.hostname, databasePort: databaseTarget.port || "5432", databaseName: databaseTarget.pathname.slice(1) }, "Database target configured");
async function warmDatabase() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection ready");
  } catch (error) {
    // Prisma connects lazily for requests. Do not retry immediately during
    // startup: a database outage must not create a connection storm or make
    // the hosting process restart loop worse.
    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
    logger.error({ message: message.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/i, "$1[redacted]$2"), code }, "Database warm-up failed; continuing with lazy reconnect");
  }
}
void warmDatabase();
server.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT, pid: process.pid }, "API listening");
});

if (env.PROCESS_DIAGNOSTICS) {
  setInterval(() => logger.info(processDetails(), "Process diagnostics"), 60000).unref();
}

let shutdownStarted = false;
function handleSignal(signal: NodeJS.Signals) {
  console.error("OS_SIGNAL_DIAGNOSTIC", {
    signal,
    pid: process.pid,
    ppid: process.ppid,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
  void gracefulShutdown(signal);
}

async function gracefulShutdown(signal: string) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  io.close();
  const forceExit = setTimeout(() => {
    logger.error({ signal, ...processDetails() }, "Forced shutdown after graceful shutdown timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(forceExit);
    logger.info({ signal, exitCode: 0, ...processDetails() }, "Server closed");
    process.exit(0);
  });
}

const signals = ["SIGTERM", "SIGINT", "SIGHUP", "SIGQUIT"] as const;
for (const signal of signals) {
  process.once(signal, () => handleSignal(signal));
}
process.once("exit", (code) => {
  logger.info({ code, ...processDetails() }, "Process exiting");
});
