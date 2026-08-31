import { app } from "./app.js";
import { env } from "./config/env.js";
import { createServer } from "node:http";
import { attachSocketServer } from "./realtime/socket.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";

const server = createServer(app);
const io = attachSocketServer(server);
server.listen(env.PORT, () => {
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
