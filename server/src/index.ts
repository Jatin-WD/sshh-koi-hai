import { app } from "./app.js";
import { env } from "./config/env.js";
import { createServer } from "node:http";
import { attachSocketServer } from "./realtime/socket.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";
const server = createServer(app);
// Keep the Node upstream below Hostinger's 120-entry-process quota even when
// the reverse proxy opens many concurrent connections.
server.maxConnections = 50;
server.requestTimeout = env.REQUEST_TIMEOUT_MS;
server.headersTimeout = env.REQUEST_TIMEOUT_MS + 5000;
server.keepAliveTimeout = 5000;
const io = attachSocketServer(server);
const databaseTarget = new URL(env.DATABASE_URL);
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
server.listen(env.PORT, "0.0.0.0", () => {
  logger.info({ port: env.PORT }, "API listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal");
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
