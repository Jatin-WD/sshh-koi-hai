import { app } from "./app.js";
import { env } from "./config/env.js";
import { createServer } from "node:http";
import { attachSocketServer } from "./realtime/socket.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (env.NODE_ENV === "production") {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const prismaCli = path.resolve(serverDir, "../../node_modules/prisma/build/index.js");
  const schema = path.resolve(serverDir, "../prisma/schema.prisma");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schema], { stdio: "inherit" });
}

const server = createServer(app);
const io = attachSocketServer(server);
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
