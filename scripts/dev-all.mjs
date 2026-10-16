import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const root = process.cwd();
const processes = new Set();
const syncTimers = new Set();
let shuttingDown = false;
let shutdownTimer;
let redact = (value) => value;

// Windows treats environment names case-insensitively. Normalize before merging
// so the inherited process value wins even when a dotenv key uses another case.
const mergeEnvironment = (...sources) => {
  const env = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      env[process.platform === "win32" ? key.toUpperCase() : key] = value;
    }
  }
  return env;
};

const findFinancePython = (env) => {
  const executable = process.platform === "win32"
    ? "python.exe"
    : path.join("bin", "python");
  const candidates = [];
  if (env.CONDA_DEFAULT_ENV === "financeDev-server" && env.CONDA_PREFIX) {
    candidates.push(path.join(env.CONDA_PREFIX, executable));
  }
  if (env.CONDA_EXE) {
    candidates.push(path.resolve(
      path.dirname(env.CONDA_EXE), "..", "envs", "financeDev-server", executable,
    ));
  }
  const profile = env.USERPROFILE || env.HOME;
  if (profile) {
    for (const distribution of ["miniconda3", "anaconda3"]) {
      candidates.push(path.join(profile, distribution, "envs", "financeDev-server", executable));
    }
  }
  return candidates.find((candidate) => existsSync(candidate)) || "python";
};

const syncDelay = (value, fallback) => {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return fallback;
  const delay = Number(value.trim());
  return Number.isSafeInteger(delay) && delay <= 2_147_483_647 ? delay : fallback;
};

const prefixOutput = (name, stream, output) => {
  let buffer = "";
  const write = (line) => {
    if (line) output.write(`[${name}] ${redact(line)}\n`);
  };
  const flush = () => {
    write(buffer);
    buffer = "";
  };
  stream?.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(write);
  });
  stream?.on("end", flush);
  return flush;
};

const kill = (record, signal) => {
  if (record.exited || !record.child.pid) return;
  try {
    record.child.kill(signal);
  } catch {
    // Raw exceptions may contain command arguments or configuration values.
    console.error(`[dev] Could not stop ${record.name}.`);
  }
};

const stopAll = (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const timer of syncTimers) clearTimeout(timer);
  syncTimers.clear();
  if (!processes.size) return;
  shutdownTimer = setTimeout(() => {
    shutdownTimer = undefined;
    for (const record of processes) kill(record, "SIGKILL");
  }, 5000);
  for (const record of processes) kill(record, "SIGTERM");
};

process.on("SIGINT", () => stopAll(130));
process.on("SIGTERM", () => stopAll(143));

const start = ({ name, command, args, env, oneShot = false, background = false }) => {
  if (shuttingDown) return;
  const fail = (message) => {
    if (background) console.warn(`${message} Services will continue.`);
    else {
      console.error(message);
      stopAll(1);
    }
  };
  let child;
  try {
    child = spawn(command, args, {
      cwd: root,
      env,
      shell: false,
      windowsHide: true,
      stdio: [oneShot ? "ignore" : "inherit", "pipe", "pipe"],
    });
  } catch {
    fail(`[dev] Could not start ${name}. Check the configured executable.`);
    return;
  }

  const record = { name, child, exited: false };
  processes.add(record);
  const flushStdout = prefixOutput(name, child.stdout, process.stdout);
  const flushStderr = prefixOutput(name, child.stderr, process.stderr);
  child.on("error", () => {
    if (shuttingDown) return;
    fail(`[dev] ${name} failed to start or encountered a process error.`);
  });
  child.on("exit", (code, signal) => {
    record.exited = true;
    if (shuttingDown || oneShot) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[dev] ${name} exited with ${reason}.`);
    stopAll(code ?? 1);
  });
  child.on("close", (code, signal) => {
    flushStdout();
    flushStderr();
    processes.delete(record);
    if (shuttingDown) {
      if (!processes.size && shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = undefined;
      }
      return;
    }
    if (oneShot) {
      if (!background) process.exitCode = code ?? 1;
      if (code === 0) console.log(`[${name}] Completed.`);
      else {
        const reason = signal ? `signal ${signal}` : `code ${code}`;
        if (background) console.warn(`[${name}] Failed with ${reason}. Services will continue.`);
        else console.error(`[${name}] Failed with ${reason}.`);
      }
    }
  });
};

const main = () => {
  const [mode, ...syncArgs] = process.argv.slice(2);
  const withBackgroundSync = mode === "--with-universe-sync";
  if ((mode && mode !== "--sync-universe" && !withBackgroundSync)
    || (withBackgroundSync && syncArgs.length)) {
    console.error("Usage: npm run dev [-- --with-universe-sync] | npm run sync:top-picks -- <sync arguments>");
    process.exitCode = 1;
    return;
  }

  let localEnv;
  try {
    const serverEnvPath = path.join(root, "server", ".env");
    localEnv = existsSync(serverEnvPath)
      ? parseEnv(readFileSync(serverEnvPath, "utf8"))
      : {};
  } catch {
    console.error("[dev] Could not read server/.env. Check the file and permissions.");
    process.exitCode = 1;
    return;
  }

  const shellEnv = mergeEnvironment(process.env);
  const backendEnv = mergeEnvironment(localEnv, shellEnv, {
    PYTHONPATH: path.join(root, "server"),
  });
  const privateValues = Object.entries(backendEnv)
    .filter(([key, value]) => /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key) && value)
    .map(([, value]) => value)
    .sort((left, right) => right.length - left.length);
  redact = (line) => privateValues.reduce(
    (text, value) => text.split(value).join("[redacted]"),
    line,
  );
  const python = backendEnv.FINANCE_DEV_SERVER_PYTHON
    || (withBackgroundSync ? findFinancePython(backendEnv) : "python");
  if (mode === "--sync-universe") {
    console.log("[dev] Running the explicitly requested Top Picks universe sync.");
    start({
      name: "top-picks-sync",
      command: python,
      args: [path.join("scripts", "sync_top_picks_universe.py"), ...syncArgs],
      env: backendEnv,
      oneShot: true,
    });
    return;
  }

  console.log("");
  console.log("Project link");
  console.log("Client: http://localhost:3000");
  console.log("");
  console.log("[dev] Starting Flask API on http://127.0.0.1:8080");
  console.log("[dev] Starting Next client on http://localhost:3000");
  start({ name: "server", command: python, args: ["-m", "src.server"], env: backendEnv });
  start({
    name: "client",
    command: process.platform === "win32" ? "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm", "--prefix", "client", "run", "dev"]
      : ["--prefix", "client", "run", "dev"],
    // Server dotenv defaults are never merged into Next. Also exclude inherited
    // server Supabase settings; the client uses its own NEXT_PUBLIC_ settings.
    env: Object.fromEntries(Object.entries(shellEnv).filter(([key]) => !/^SUPABASE_/i.test(key))),
  });

  if (withBackgroundSync && !shuttingDown) {
    const jobs = [
      {
        preset: "ASX200",
        enabled: backendEnv.TOP_PICKS_DEV_SYNC_ASX200,
        delay: syncDelay(backendEnv.TOP_PICKS_DEV_SYNC_DELAY_MS, 60000),
      },
      {
        preset: "SP500",
        enabled: backendEnv.TOP_PICKS_DEV_SYNC_SP500,
        delay: syncDelay(backendEnv.TOP_PICKS_DEV_SYNC_SP500_DELAY_MS, 90000),
      },
    ].filter(({ enabled }) => enabled?.trim().toLowerCase() !== "false");
    console.log(jobs.length
      ? "[dev] Top Picks universe sync will run in the background."
      : "[dev] Background Top Picks universe sync is disabled.");
    for (const { preset, delay } of jobs) {
      const timer = setTimeout(() => {
        syncTimers.delete(timer);
        if (shuttingDown) return;
        console.log(`[dev] Syncing ${preset} universe in the background`);
        start({
          name: `top-picks-sync-${preset.toLowerCase()}`,
          command: python,
          args: [path.join("scripts", "sync_top_picks_universe.py"), "--preset", preset],
          env: backendEnv,
          oneShot: true,
          background: true,
        });
      }, delay);
      syncTimers.add(timer);
    }
  }
};

main();
