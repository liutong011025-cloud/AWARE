import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/aware";
}

const result = spawnSync("prisma", ["generate"], { stdio: "inherit", shell: true, env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
