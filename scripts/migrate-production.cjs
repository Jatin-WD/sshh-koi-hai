const { spawnSync } = require("node:child_process");
const path = require("node:path");

if (process.env.NODE_ENV !== "production") process.exit(0);

const prismaCli = path.resolve(__dirname, "../node_modules/prisma/build/index.js");
const schema = path.resolve(__dirname, "../server/prisma/schema.prisma");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schema], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
