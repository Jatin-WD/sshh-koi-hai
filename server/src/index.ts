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
async function warmDatabase() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$connect();
      logger.info({ attempt }, "Database connection ready");
      return;
    } catch (error) {
      logger.warn({ err: error, attempt }, "Database warm-up failed; retrying");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  logger.error("Database warm-up exhausted; Prisma will reconnect on demand");
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
