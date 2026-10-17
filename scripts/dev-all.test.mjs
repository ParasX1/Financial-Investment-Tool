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
  existingFiles = [],
} = {}) {
  const children = [];
  let spawnAttempts = 0;
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
    existsSync: (filePath) =>
      (filePath === path.join(root, "server", ".env") && !!localEnv) ||
      existingFiles.includes(filePath),
    readFileSync: () => {
      if (envReadThrows) throw new Error("dummy-private-value");
      return localEnv;
    },
    spawn: (command, childArgs, options) => {
      if (spawnAttempts++ === spawnThrowsAt) throw new Error("dummy-private-value");
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
    runTimer(timer) {
      timers.delete(timer);
      timer.callback();
    },
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
  assert.match(run.stdout.join("\n"), /Project link/);
  assert.match(run.stdout.join("\n"), /Client: http:\/\/localhost:3000/);
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

const withUniverseSync = ["--with-universe-sync"];
const syncJobs = (run) => run.children.filter((child) => child.args.includes("--preset"));
const scheduledDelays = (run) => [...run.timers.values()].map(({ delay }) => delay);

test("external-env mode starts both services immediately and schedules the two background presets", () => {
  const run = fixture({
    args: withUniverseSync,
    localEnv: "SUPABASE_SERVICE_ROLE_KEY=dummy-private-sync-key\nPRIVATE_SETTING=dummy-server-setting",
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://dummy-browser.invalid" },
  });
  assert.equal(run.children.length, 2);
  assert.deepEqual(run.children[0].args, ["-m", "src.server"]);
  assert.deepEqual(run.children[1].args, ["--prefix", "client", "run", "dev"]);
  assert.deepEqual(scheduledDelays(run), [60000, 90000]);
  assert.match(run.stdout.join("\n"), /Project link/);
  assert.match(run.stdout.join("\n"), /Client: http:\/\/localhost:3000/);

  const [asxTimer, sp500Timer] = run.timers.keys();
  run.runTimer(asxTimer);
  assert.deepEqual(syncJobs(run)[0].args, [path.join("scripts", "sync_top_picks_universe.py"), "--preset", "ASX200"]);
  run.runTimer(sp500Timer);
  assert.deepEqual(syncJobs(run)[1].args, [path.join("scripts", "sync_top_picks_universe.py"), "--preset", "SP500"]);
  assert.equal(run.timers.size, 0);
  for (const job of syncJobs(run)) {
    assert.equal(job.options.env.SUPABASE_SERVICE_ROLE_KEY, "dummy-private-sync-key");
    assert.equal(job.options.env.PRIVATE_SETTING, "dummy-server-setting");
    assert.equal(job.options.env.PYTHONPATH, path.join(run.root, "server"));
    assert.deepEqual(Array.from(job.options.stdio), ["ignore", "pipe", "pipe"]);
  }
  assert.equal(run.children[1].options.env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(run.children[1].options.env.PRIVATE_SETTING, undefined);
  assert.equal(run.children[1].options.env.NEXT_PUBLIC_SUPABASE_URL, "https://dummy-browser.invalid");
  syncJobs(run)[0].stdout.emit("data", Buffer.from("key=dummy-private-sync-key\n"));
  assert.match(run.stdout.join("\n"), /key=\[redacted\]/);
  assert.doesNotMatch([...run.stdout, ...run.stderr].join("\n"), /dummy-private-sync-key/);
  assert.equal(run.parent.exitCode, undefined);
});

test("each personal background preset can be disabled case-insensitively", () => {
  for (const [env, expectedPreset, expectedDelay] of [
    [{ TOP_PICKS_DEV_SYNC_ASX200: "FALSE" }, "SP500", 90000],
    [{ TOP_PICKS_DEV_SYNC_SP500: "False" }, "ASX200", 60000],
  ]) {
    const run = fixture({ args: withUniverseSync, env });
    assert.deepEqual(scheduledDelays(run), [expectedDelay]);
    run.runTimers();
    assert.equal(syncJobs(run).length, 1);
    assert.equal(syncJobs(run)[0].args.at(-1), expectedPreset);
  }
  const disabled = fixture({
    args: withUniverseSync,
    env: { TOP_PICKS_DEV_SYNC_ASX200: "false", TOP_PICKS_DEV_SYNC_SP500: "FALSE" },
  });
  assert.equal(disabled.children.length, 2);
  assert.equal(disabled.timers.size, 0);
});

test("background delay overrides accept zero and the largest safe Node timeout", () => {
  const run = fixture({
    args: withUniverseSync,
    env: { TOP_PICKS_DEV_SYNC_DELAY_MS: "0", TOP_PICKS_DEV_SYNC_SP500_DELAY_MS: "2147483647" },
  });
  assert.equal(run.children.length, 2);
  assert.deepEqual(scheduledDelays(run), [0, 2147483647]);
  run.runTimers();
  assert.equal(syncJobs(run).length, 2);
});

test("invalid background delays fall back instead of scheduling immediate or truncated work", () => {
  for (const value of ["", "-1", "1.5", "12000ms", "NaN", "Infinity", "2147483648"]) {
    const run = fixture({
      args: withUniverseSync,
      env: { TOP_PICKS_DEV_SYNC_DELAY_MS: value, TOP_PICKS_DEV_SYNC_SP500_DELAY_MS: value },
    });
    assert.deepEqual(scheduledDelays(run), [60000, 90000], value);
  }
});

test("external-env mode rejects unexpected trailing arguments before starting anything", () => {
  for (const args of [
    ["--with-universe-sync", "--unexpected"],
    ["--with-universe-sync", "--sync-universe"],
    ["--with-universe-sync", "--with-universe-sync"],
  ]) {
    const run = fixture({ args });
    assert.equal(run.children.length, 0);
    assert.equal(run.timers.size, 0);
    assert.equal(run.parent.exitCode, 1);
    assert.match(run.stderr.join("\n"), /Usage/);
  }
});

test("configured Python overrides discovered Conda for the API and both personal jobs", () => {
  const condaPrefix = path.resolve("fake-active-conda");
  const run = fixture({
    args: withUniverseSync,
    platform: "win32",
    existingFiles: [path.join(condaPrefix, "python.exe")],
    localEnv: "FINANCE_DEV_SERVER_PYTHON=dummy-file-python",
    env: {
      FINANCE_DEV_SERVER_PYTHON: "dummy-chosen-python",
      CONDA_PREFIX: condaPrefix,
      CONDA_DEFAULT_ENV: "financeDev-server",
    },
  });
  run.runTimers();
  assert.equal(run.children[0].command, "dummy-chosen-python");
  assert.deepEqual(syncJobs(run).map((job) => job.command), ["dummy-chosen-python", "dummy-chosen-python"]);
});

test("personal mode discovers an active financeDev-server on Windows and Unix", () => {
  for (const platform of ["win32", "linux"]) {
    const condaPrefix = path.resolve(`fake-active-${platform}`);
    const python = path.join(condaPrefix, platform === "win32" ? "python.exe" : path.join("bin", "python"));
    const run = fixture({
      args: withUniverseSync,
      platform,
      existingFiles: [python],
      env: { CONDA_PREFIX: condaPrefix, CONDA_DEFAULT_ENV: "financeDev-server" },
    });
    assert.equal(run.children[0].command, python);
    run.runTimers();
    assert.ok(syncJobs(run).every((job) => job.command === python));
  }
});

test("personal mode discovers the named environment beside the configured Conda executable", () => {
  for (const platform of ["win32", "linux"]) {
    const condaBase = path.resolve(`fake-install-${platform}`);
    const python = path.join(condaBase, "envs", "financeDev-server", platform === "win32" ? "python.exe" : path.join("bin", "python"));
    const run = fixture({
      args: withUniverseSync,
      platform,
      existingFiles: [python],
      env: {
        CONDA_EXE: path.join(condaBase, platform === "win32" ? "Scripts" : "bin", platform === "win32" ? "conda.exe" : "conda"),
      },
    });
    assert.equal(run.children[0].command, python);
  }
});

test("personal mode checks both standard Conda distributions below the user's home", () => {
  for (const platform of ["win32", "linux"]) {
    for (const distribution of ["miniconda3", "anaconda3"]) {
      const userDirectory = path.resolve(`fake-home-${platform}`);
      const python = path.join(userDirectory, distribution, "envs", "financeDev-server", platform === "win32" ? "python.exe" : path.join("bin", "python"));
      const run = fixture({
        args: withUniverseSync,
        platform,
        existingFiles: [python],
        env: { [platform === "win32" ? "USERPROFILE" : "HOME"]: userDirectory },
      });
      assert.equal(run.children[0].command, python);
    }
  }
});

test("a different active Conda environment is not mistaken for financeDev-server", () => {
  const wrongPrefix = path.resolve("fake-unrelated-conda");
  const run = fixture({
    args: withUniverseSync,
    platform: "win32",
    existingFiles: [path.join(wrongPrefix, "python.exe")],
    env: { CONDA_PREFIX: wrongPrefix, CONDA_DEFAULT_ENV: "another-project" },
  });
  assert.equal(run.children[0].command, "python");
});

test("missing Conda candidates fall through to a later installation or PATH", () => {
  const userDirectory = path.resolve("fake-fallback-home");
  const python = path.join(userDirectory, "anaconda3", "envs", "financeDev-server", "python.exe");
  const env = {
    CONDA_PREFIX: path.resolve("fake-missing-active"),
    CONDA_DEFAULT_ENV: "financeDev-server",
    CONDA_EXE: path.resolve("fake-missing-install", "Scripts", "conda.exe"),
    USERPROFILE: userDirectory,
  };
  const found = fixture({ args: withUniverseSync, platform: "win32", env, existingFiles: [python] });
  assert.equal(found.children[0].command, python);
  const missing = fixture({ args: withUniverseSync, platform: "win32", env });
  assert.equal(missing.children[0].command, "python");
});

test("ordinary dev and explicit sync retain PATH Python despite discoverable personal Conda", () => {
  const condaPrefix = path.resolve("fake-personal-only-conda");
  for (const args of [[], ["--sync-universe", "--preset", "SP500"]]) {
    const run = fixture({
      args,
      platform: "win32",
      existingFiles: [path.join(condaPrefix, "python.exe")],
      env: { CONDA_PREFIX: condaPrefix, CONDA_DEFAULT_ENV: "financeDev-server" },
    });
    assert.equal(run.children[0].command, "python");
    assert.equal(run.timers.size, 0);
  }
});

test("a synchronous background spawn failure does not stop services or the other preset", () => {
  const run = fixture({ args: withUniverseSync, spawnThrowsAt: 2 });
  run.runTimers();
  assert.equal(run.children.length, 3);
  assert.equal(syncJobs(run)[0].args.at(-1), "SP500");
  assert.equal(run.parent.exitCode, undefined);
  assert.ok(run.children.every((child) => child.kills.length === 0));
  assert.match(run.stderr.join("\n"), /top-picks-sync|ASX200|asx200/);
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
});

test("an asynchronous background process error remains nonfatal even without a PID", () => {
  const run = fixture({ args: withUniverseSync, env: { TOP_PICKS_DEV_SYNC_SP500: "false" } });
  run.runTimers();
  const job = syncJobs(run)[0];
  job.pid = undefined;
  job.emit("error", new Error("dummy-private-value"));
  run.close(job, -2);
  assert.equal(run.parent.exitCode, undefined);
  assert.equal(run.timers.size, 0);
  assert.ok(run.children.every((child) => child.kills.length === 0));
  assert.match(run.stderr.join("\n"), /top-picks-sync|ASX200|asx200/);
  assert.doesNotMatch(run.stderr.join("\n"), /dummy-private-value/);
});

test("completed, failed, and signalled background jobs never poison the launcher exit code", () => {
  for (const [code, signal] of [[0, null], [2, null], [null, "SIGTERM"]]) {
    const run = fixture({ args: withUniverseSync, env: { TOP_PICKS_DEV_SYNC_SP500: "false" } });
    run.runTimers();
    run.close(syncJobs(run)[0], code, signal);
    assert.equal(run.parent.exitCode, undefined);
    assert.ok(run.children.slice(0, 2).every((child) => child.kills.length === 0));
    if (code === 0) assert.match(run.stdout.join("\n"), /Completed/);
    else assert.match(run.stderr.join("\n"), code === 2 ? /code 2/ : /signal SIGTERM/);
  }
});

test("shutdown cancels both scheduled syncs and ignores already-queued timer callbacks", () => {
  const run = fixture({ args: withUniverseSync });
  const lateCallbacks = [...run.timers.values()].map(({ callback }) => callback);
  run.parent.emit("SIGINT");
  assert.deepEqual(scheduledDelays(run), [5000]);
  lateCallbacks.forEach((callback) => callback());
  assert.equal(syncJobs(run).length, 0);
  run.children.forEach((child) => run.close(child, null, "SIGTERM"));
  assert.equal(run.timers.size, 0);
  assert.equal(run.parent.exitCode, 130);
});

test("shutdown owns an already-running background job and cancels the later preset", () => {
  const run = fixture({ args: withUniverseSync });
  const [asxTimer, sp500Timer] = run.timers.keys();
  run.runTimer(asxTimer);
  assert.equal(syncJobs(run).length, 1);
  run.parent.emit("SIGTERM");
  assert.deepEqual(scheduledDelays(run), [5000]);
  sp500Timer.callback();
  assert.equal(syncJobs(run).length, 1);
  assert.ok(run.children.every((child) => child.kills.join() === "SIGTERM"));
  run.children.forEach((child) => run.close(child, null, "SIGTERM"));
  assert.equal(run.timers.size, 0);
  assert.equal(run.parent.exitCode, 143);
});

test("required-service failure cancels pending syncs and preserves its failure code", () => {
  const run = fixture({ args: withUniverseSync });
  const lateCallbacks = [...run.timers.values()].map(({ callback }) => callback);
  run.children[0].emit("exit", 3, null);
  assert.deepEqual(scheduledDelays(run), [5000]);
  lateCallbacks.forEach((callback) => callback());
  assert.equal(syncJobs(run).length, 0);
  assert.deepEqual(run.children[1].kills, ["SIGTERM"]);
  run.children[0].emit("close", 3, null);
  run.close(run.children[1], null, "SIGTERM");
  assert.equal(run.timers.size, 0);
  assert.equal(run.parent.exitCode, 3);
});

test("personal mode does not schedule work after its required API fails to spawn", () => {
  const run = fixture({ args: withUniverseSync, spawnThrowsAt: 0 });
  assert.equal(run.children.length, 0);
  assert.equal(run.timers.size, 0);
  assert.equal(run.parent.exitCode, 1);
});
