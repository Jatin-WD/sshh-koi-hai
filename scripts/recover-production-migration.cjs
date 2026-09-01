const { spawnSync } = require("node:child_process");
const path = require("node:path");

if (process.env.NODE_ENV !== "production") throw new Error("Set NODE_ENV=production before database recovery");

const prismaCli = path.resolve(__dirname, "../node_modules/prisma/build/index.js");
const schema = path.resolve(__dirname, "../server/prisma/schema.prisma");
const run = (args) => {
  const result = spawnSync(process.execPath, [prismaCli, ...args, "--schema", schema], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(["migrate", "resolve", "--applied", "20260831000000_initial"]);
run(["migrate", "deploy"]);
