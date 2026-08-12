import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverEnvPath = path.join(root, "server", ".env");
const defaultCondaPython =
  "C:\\Users\\Johnny\\miniconda3\\envs\\financeDev-server\\python.exe";
const python =
  process.env.FINANCE_DEV_SERVER_PYTHON ||
  (existsSync(defaultCondaPython) ? defaultCondaPython : "python");
const asxSyncDelayMs = Number.parseInt(
  process.env.TOP_PICKS_DEV_SYNC_DELAY_MS || "60000",
  10,
);
const sp500SyncDelayMs = Number.parseInt(
  process.env.TOP_PICKS_DEV_SYNC_SP500_DELAY_MS || "90000",
  10,
);

const processes = [];

const readLocalEnv = (filePath) => {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) return env;

      const [, key, rawValue] = match;
      const value = rawValue
        .replace(/^(['"])(.*)\1$/, "$2")
        .trim();
      return { ...env, [key]: value };
    }, {});
};

const localEnv = readLocalEnv(serverEnvPath);

const prefixOutput = (name, stream, output) => {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines
      .filter((line) => line.length > 0)
      .forEach((line) => output.write(`[${name}] ${line}\n`));
  });
};

const start = ({ name, command, args, cwd, env = {} }) => {
  const child = spawn(command, args, {
    cwd,
    env: { ...localEnv, ...process.env, ...env },
    shell: false,
    stdio: ["inherit", "pipe", "pipe"],
  });

  processes.push(child);
  prefixOutput(name, child.stdout, process.stdout);
  prefixOutput(name, child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopAll();
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[dev] ${name} exited with ${reason}.`);
    process.exit(code ?? 1);
  });

  return child;
};

const startOneShot = ({ name, command, args, cwd, env = {} }) => {
  const child = spawn(command, args, {
    cwd,
    env: { ...localEnv, ...process.env, ...env },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixOutput(name, child.stdout, process.stdout);
  prefixOutput(name, child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code === 0) {
      console.log(`[${name}] Completed.`);
      return;
    }
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.warn(`[${name}] Skipped or failed with ${reason}.`);
  });

  return child;
};

let shuttingDown = false;

const stopAll = () => {
  processes.forEach((child) => {
    if (!child.killed) child.kill();
  });
};

process.on("SIGINT", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

console.log("");
console.log("Project link");
console.log("Client: http://localhost:3000");
console.log("");
console.log("[dev] Starting Flask API on http://127.0.0.1:8080");
console.log("[dev] Starting Next client on http://localhost:3000");
console.log("[dev] Top Picks universe sync will run in the background.");

start({
  name: "server",
  command: python,
  args: ["-m", "src.server"],
  cwd: root,
  env: {
    PYTHONPATH: path.join(root, "server"),
  },
});

start({
  name: "client",
  command: process.platform === "win32" ? "cmd.exe" : "npm",
  args:
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm", "--prefix", "client", "run", "dev"]
      : ["--prefix", "client", "run", "dev"],
  cwd: root,
});

if (process.env.TOP_PICKS_DEV_SYNC_ASX200 !== "false") {
  setTimeout(() => {
    if (shuttingDown) return;
    console.log("[dev] Syncing ASX200 universe in the background");
    startOneShot({
      name: "top-picks-sync-asx200",
      command: python,
      args: [
        path.join("scripts", "sync_top_picks_universe.py"),
        "--preset",
        "ASX200",
      ],
      cwd: root,
      env: {
        PYTHONPATH: path.join(root, "server"),
      },
    });
  }, Number.isFinite(asxSyncDelayMs) && asxSyncDelayMs >= 0
    ? asxSyncDelayMs
    : 60000);
}

if (process.env.TOP_PICKS_DEV_SYNC_SP500 !== "false") {
  setTimeout(() => {
    if (shuttingDown) return;
    console.log("[dev] Syncing S&P 500 universe in the background");
    startOneShot({
      name: "top-picks-sync-sp500",
      command: python,
      args: [
        path.join("scripts", "sync_top_picks_universe.py"),
        "--preset",
        "SP500",
      ],
      cwd: root,
      env: {
        PYTHONPATH: path.join(root, "server"),
      },
    });
  }, Number.isFinite(sp500SyncDelayMs) && sp500SyncDelayMs >= 0
    ? sp500SyncDelayMs
    : 90000);
}
