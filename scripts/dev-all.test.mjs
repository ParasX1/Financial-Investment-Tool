import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { Script } from "node:vm";

const scriptPath = fileURLToPath(new URL("./dev-all.mjs", import.meta.url));
// Inject only the imported system boundaries. Execute the complete launcher body
// with fake processes; never read private dotenv files or launch a real child.
const source = readFileSync(scriptPath, "utf8").replace(
  /^import .* from "node:[^"]+";\r?$/gm,
  "",
);

function fixture({
  args = [],
  env = {},
  localEnv = "",
  platform = "linux",
  spawnThrowsAt,
  killThrows = false,
  missingStreams = false,
  envReadThrows = false,
} = {}) {
  const children = [];
  const timers = new Map();
  const stdout = [];
  const stderr = [];
  const exits = [];
  const root = path.resolve("fake-project");
  const parent = new EventEmitter();
  Object.assign(parent, {
    argv: ["node", scriptPath, ...args],
    cwd: () => root,
    platform,
    env: { PATH: "dummy-executable-path", ...env },
    stdout: { write: (value) => stdout.push(value) },
    stderr: { write: (value) => stderr.push(value) },
    exit: (code) => exits.push(code),
  });
  const context = {
    process: parent,
    path,
    parseEnv,
    existsSync: (filePath) => filePath === path.join(root, "server", ".env") && !!localEnv,
    readFileSync: () => {
      if (envReadThrows) throw new Error("dummy-private-value");
      return localEnv;
    },
    spawn: (command, childArgs, options) => {
      if (children.length === spawnThrowsAt) throw new Error("dummy-private-value");
      const child = new EventEmitter();
      Object.assign(child, {
        command,
        args: Array.from(childArgs),
        options,
        pid: children.length + 10,
        stdout: missingStreams ? null : new EventEmitter(),
        stderr: missingStreams ? null : new EventEmitter(),
        killed: false,
        kills: [],
        kill(signal = "SIGTERM") {
          this.kills.push(signal);
          if (killThrows) throw new Error("dummy-private-value");
          this.killed = true;
          return true;
        },
      });
      children.push(child);
      return child;
    },
    setTimeout: (callback, delay) => {
      const timer = { callback, delay };
      timers.set(timer, timer);
      return timer;
    },
    clearTimeout: (timer) => timers.delete(timer),
    console: {
      log: (...values) => stdout.push(values.join(" ")),
      error: (...values) => stderr.push(values.join(" ")),
      warn: (...values) => stderr.push(values.join(" ")),
    },
  };
  new Script(source, { filename: scriptPath }).runInNewContext(context);
  return {
    children,
    timers,
    parent,
    stdout,
    stderr,
    exits,
    root,
    runTimers() {
      for (const [timer, { callback }] of [...timers]) {
        timers.delete(timer);
        callback();
      }
    },
    close(child, code = 0, signal = null) {
      child.emit("exit", code, signal);
      child.stdout?.emit("end");
      child.stderr?.emit("end");
      child.emit("close", code, signal);
    },
  };
}

test("ordinary dev starts only the API and client, even with legacy sync opt-ins", () => {
  const run = fixture({ env: { TOP_PICKS_DEV_SYNC_ASX200: "true", TOP_PICKS_DEV_SYNC_SP500: "true" } });
  run.runTimers();
  assert.equal(run.children.length, 2);
  assert.equal(run.timers.size, 0);
  assert.deepEqual(run.children[0].args, ["-m", "src.server"]);
  assert.deepEqual(run.children[1].args, ["--prefix", "client", "run", "dev"]);
});

test("server dotenv values reach only Python; process settings override file defaults", () => {
  const run = fixture({
    localEnv: "SUPABASE_SERVICE_ROLE_KEY=dummy-file-key\nPRIVATE_SETTING=dummy-server-only\nSUPABASE_URL=https://dummy-file.invalid\n",
    env: { SUPABASE_SERVICE_ROLE_KEY: "dummy-shell-key", SUPABASE_URL: "https://dummy-shell.invalid", NEXT_PUBLIC_SUPABASE_URL: "https://dummy-browser.invalid" },
  });
  assert.equal(run.children[0].options.env.SUPABASE_SERVICE_ROLE_KEY, "dummy-shell-key");
  assert.equal(run.children[0].options.env.SUPABASE_URL, "https://dummy-shell.invalid");
  assert.equal(run.children[0].options.env.PRIVATE_SETTING, "dummy-server-only");
  assert.equal(run.children[0].options.env.PYTHONPATH, path.join(run.root, "server"));
  assert.equal(run.children[1].options.env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(run.children[1].options.env.SUPABASE_URL, undefined);
  assert.equal(run.children[1].options.env.PRIVATE_SETTING, undefined);
  assert.equal(run.children[1].options.env.NEXT_PUBLIC_SUPABASE_URL, "https://dummy-browser.invalid");
  assert.equal(run.parent.env.PRIVATE_SETTING, undefined);
  assert.doesNotMatch([...run.stdout, ...run.stderr].join("\n"), /dummy-(file|shell|server)/);
});

test("dotenv parsing handles exports, comments, spaces, and quoted values", () => {
  const run = fixture({ localEnv: "# ignored\nexport PRIVATE_SETTING = 'value # retained'\nFINANCE_DEV_SERVER_PYTHON = \"dummy python path\" # ignored\n" });
  assert.equal(run.children[0].command, "dummy python path");
  assert.equal(run.children[0].options.env.PRIVATE_SETTING, "value # retained");
});

test("Windows uses cmd for npm and case-insensitive process precedence", () => {
  const run = fixture({ platform: "win32", localEnv: "SUPABASE_KEY=dummy-file-key\nPATH=dummy-file-path\nFINANCE_DEV_SERVER_PYTHON=dummy-file-python\n", env: { supabase_key: "dummy-shell-key", Path: "dummy-shell-path", finance_dev_server_python: "dummy-shell-python" } });
  assert.equal(run.children[0].command, "dummy-shell-python");
  assert.equal(run.children[0].options.env.SUPABASE_KEY, "dummy-shell-key");
  assert.equal(run.children[0].options.env.PATH, "dummy-shell-path");
  assert.equal(run.children[1].options.env.SUPABASE_KEY, undefined);
  assert.equal(run.children[1].command, "cmd.exe");
  assert.deepEqual(run.children[1].args, ["/d", "/s", "/c", "npm", "--prefix", "client", "run", "dev"]);
  assert.equal(run.children[1].options.shell, false);
  assert.equal(run.children[1].options.windowsHide, true);
});

test("explicit sync launches one owned Python job and forwards its arguments", () => {
  const run = fixture({ args: ["--sync-universe", "--preset", "ASX200", "--dry-run"], localEnv: "SUPABASE_SERVICE_ROLE_KEY=dummy-file-key" });
  assert.equal(run.children.length, 1);
  assert.deepEqual(run.children[0].args, [path.join("scripts", "sync_top_picks_universe.py"), "--preset", "ASX200", "--dry-run"]);
  assert.equal(run.children[0].options.env.SUPABASE_SERVICE_ROLE_KEY, "dummy-file-key");
  assert.equal(run.timers.size, 0);
  run.close(run.children[0]);
  assert.equal(run.parent.exitCode, 0);
  assert.match(run.stdout.join("\n"), /Completed/);
  assert.deepEqual(run.exits, []);
});

test("sync failure preserves a nonzero result without launching services", () => {
  const run = fixture({ args: ["--sync-universe", "--preset", "SP500"] });
  run.close(run.children[0], 2);
  assert.equal(run.children.length, 1);
  assert.equal(run.parent.exitCode, 2);
  assert.match(run.stderr.join("\n"), /code 2/);
});

test("unknown launcher arguments fail before spawning any child", () => {
  const run = fixture({ args: ["--unexpected"] });
  assert.equal(run.children.length, 0);
  assert.equal(run.parent.exitCode, 1);
  assert.match(run.stderr.join("\n"), /Usage/);
});

test("an emitted spawn error shuts down the sibling without printing error values", () => {
  const run = fixture();
  assert.doesNotThrow(() => run.children[1].emit("error", new Error("dummy-private-value")));
  assert.equal(run.parent.exitCode, 1);
  assert.deepEqual(run.children[0].kills, ["SIGTERM"]);
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
  run.close(run.children[1], null);
  run.close(run.children[0], null, "SIGTERM");
  assert.equal(run.timers.size, 0);
  assert.deepEqual(run.exits, []);
});

test("a synchronous second spawn failure shuts down the already started API", () => {
  const run = fixture({ spawnThrowsAt: 1 });
  assert.equal(run.parent.exitCode, 1);
  assert.deepEqual(run.children[0].kills, ["SIGTERM"]);
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
  run.close(run.children[0], null, "SIGTERM");
  assert.equal(run.timers.size, 0);
});

test("the first spawn failure prevents starting the client", () => {
  const run = fixture({ spawnThrowsAt: 0 });
  assert.equal(run.children.length, 0);
  assert.equal(run.parent.exitCode, 1);
  assert.equal(run.timers.size, 0);
});

test("dotenv read errors are controlled and never expose raw exception text", () => {
  const run = fixture({ localEnv: "PRIVATE_SETTING=dummy-file-key", envReadThrows: true });
  assert.equal(run.children.length, 0);
  assert.equal(run.parent.exitCode, 1);
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
});

test("a required service exit stops its sibling and waits for both closes", () => {
  const run = fixture();
  run.children[0].emit("exit", 3, null);
  assert.equal(run.parent.exitCode, 3);
  assert.deepEqual(run.children[0].kills, []);
  assert.deepEqual(run.children[1].kills, ["SIGTERM"]);
  assert.equal(run.timers.size, 1);
  run.children[0].emit("close", 3, null);
  run.close(run.children[1], null, "SIGTERM");
  assert.equal(run.timers.size, 0);
  assert.deepEqual(run.exits, []);
});

test("SIGINT owns the sync job, and repeated signals do not repeat cleanup", () => {
  const run = fixture({ args: ["--sync-universe", "--preset", "ASX200"] });
  run.parent.emit("SIGINT");
  run.parent.emit("SIGTERM");
  assert.equal(run.parent.exitCode, 130);
  assert.deepEqual(run.children[0].kills, ["SIGTERM"]);
  run.close(run.children[0], null, "SIGTERM");
  assert.equal(run.timers.size, 0);
  assert.deepEqual(run.exits, []);
});

test("SIGTERM escalates only children still alive after the grace period", () => {
  const run = fixture();
  run.parent.emit("SIGTERM");
  run.close(run.children[0], null, "SIGTERM");
  run.runTimers();
  assert.equal(run.parent.exitCode, 143);
  assert.deepEqual(run.children[0].kills, ["SIGTERM"]);
  assert.deepEqual(run.children[1].kills, ["SIGTERM", "SIGKILL"]);
  run.close(run.children[1], null, "SIGKILL");
  assert.equal(run.timers.size, 0);
});

test("cleanup tolerates kill exceptions and absent pipe streams", () => {
  const run = fixture({ killThrows: true, missingStreams: true });
  assert.doesNotThrow(() => run.parent.emit("SIGINT"));
  assert.doesNotThrow(() => run.runTimers());
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
  run.children.forEach((child) => run.close(child, null, "SIGTERM"));
});

test("prefixed output preserves lines across chunks and flushes trailing text", () => {
  const run = fixture();
  run.children[0].stdout.emit("data", Buffer.from("first\r\npar"));
  run.children[0].stdout.emit("data", Buffer.from("tial"));
  run.children[0].stdout.emit("end");
  assert.match(run.stdout.join("\n"), /\[server\] first/);
  assert.match(run.stdout.join("\n"), /\[server\] partial/);
});

test("matched default and explicit triggers keep sync separate and use the same cleanup", () => {
  const settings = { localEnv: "SUPABASE_SERVICE_ROLE_KEY=dummy-sync-key", env: { TOP_PICKS_DEV_SYNC_ASX200: "true" } };
  const ordinary = fixture(settings);
  const explicit = fixture({ ...settings, args: ["--sync-universe", "--preset", "ASX200"] });
  assert.equal(ordinary.children.filter((child) => child.args.includes("--preset")).length, 0);
  assert.equal(explicit.children.filter((child) => child.args.includes("--preset")).length, 1);
  assert.equal(explicit.children.filter((child) => child.args.includes("src.server") || child.args.includes("client")).length, 0);
  for (const run of [ordinary, explicit]) {
    assert.equal(run.timers.size, 0);
    run.parent.emit("SIGINT");
    run.children.forEach((child) => {
      assert.deepEqual(child.kills, ["SIGTERM"]);
      run.close(child, null, "SIGTERM");
    });
    assert.equal(run.timers.size, 0);
    assert.equal(run.parent.exitCode, 130);
  }
});

test("forwarded stdout and stderr redact configured secrets across data chunks", () => {
  const run = fixture({ localEnv: "SUPABASE_SERVICE_ROLE_KEY=dummy-private-key\nAPI_TOKEN=dummy-private-token" });
  run.children[0].stdout.emit("data", Buffer.from("key=dummy-private-"));
  run.children[0].stdout.emit("data", Buffer.from("key\n\n"));
  run.children[0].stderr.emit("data", Buffer.from("token=dummy-private-token"));
  run.close(run.children[0]);
  assert.match(run.stdout.join("\n"), /key=\[redacted\]/);
  assert.match(run.stderr.join("\n"), /token=\[redacted\]/);
  assert.doesNotMatch([...run.stdout, ...run.stderr].join("\n"), /dummy-private/);
  assert.equal(run.parent.exitCode, 0);
  run.close(run.children[1], null, "SIGTERM");
});

test("failed spawn without a PID or exit event still closes and clears shutdown timers", () => {
  const run = fixture({ missingStreams: true });
  const failedChild = run.children[0];
  failedChild.pid = undefined;
  failedChild.emit("error", new Error("dummy-private-value"));
  failedChild.emit("close", -2, null);
  assert.deepEqual(failedChild.kills, []);
  assert.deepEqual(run.children[1].kills, ["SIGTERM"]);
  run.children[1].emit("error", new Error("dummy-private-value"));
  run.close(run.children[1], null, "SIGTERM");
  assert.equal(run.parent.exitCode, 1);
  assert.equal(run.timers.size, 0);
});

test("exit events during shutdown prevent force-killing an exited child awaiting close", () => {
  const run = fixture();
  run.parent.emit("SIGTERM");
  run.children[0].emit("exit", null, "SIGTERM");
  run.runTimers();
  assert.deepEqual(run.children[0].kills, ["SIGTERM"]);
  assert.deepEqual(run.children[1].kills, ["SIGTERM", "SIGKILL"]);
  run.children[0].emit("close", null, "SIGTERM");
  run.close(run.children[1], null, "SIGKILL");
});

test("a sync job terminated by a signal returns failure with a controlled reason", () => {
  const run = fixture({ args: ["--sync-universe", "--preset", "SP500"] });
  run.close(run.children[0], null, "SIGTERM");
  assert.equal(run.parent.exitCode, 1);
  assert.match(run.stderr.join("\n"), /signal SIGTERM/);
});
