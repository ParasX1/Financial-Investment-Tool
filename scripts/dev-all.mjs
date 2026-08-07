import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultCondaPython =
  "C:\\Users\\Johnny\\miniconda3\\envs\\financeDev-server\\python.exe";
const python =
  process.env.FINANCE_DEV_SERVER_PYTHON ||
  (existsSync(defaultCondaPython) ? defaultCondaPython : "python");

const processes = [];

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
    env: { ...process.env, ...env },
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
