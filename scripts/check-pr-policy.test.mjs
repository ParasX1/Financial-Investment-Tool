import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { auditPullRequest } from "./check-pr-policy.mjs";

const developmentBranch = "DevBranch";
const event = (overrides = {}) => ({
  repository: { full_name: "ParasX1/Financial-Investment-Tool" },
  pull_request: {
    base: { ref: developmentBranch },
    head: { ref: "fix/250-quality-gates" },
    body: "## Related issue\n\nCloses #250\n\n## Why\n\nRestore CI checks.",
    ...overrides,
  },
});

test("accepts an issue-number branch into the development branch", () => {
  assert.deepEqual(auditPullRequest(event()), []);
});

test("accepts the verified real DevBranch target", () => {
  assert.deepEqual(auditPullRequest(event({ base: { ref: "DevBranch" } })), []);
});

test("rejects a fabricated target made by concatenating the branch and commit", () => {
  assert.match(
    auditPullRequest(event({ base: { ref: "DevBranch53232300a" } })).join(" "),
    /target branch/,
  );
});

test("accepts all linked issues in a cohesive multi-issue branch", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        head: { ref: "chore/250-251-quality-gates" },
        body: "## Related issue\n\nCloses #250; relates to #251",
      }),
    ),
    [],
  );
});

test("accepts a same-repository issue URL", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        body: "## Related issue\n\nhttps://github.com/ParasX1/Financial-Investment-Tool/issues/250",
      }),
    ),
    [],
  );
});

test("requires a real Related issue entry instead of the template placeholder", () => {
  assert.match(
    auditPullRequest(
      event({ body: "## Related issue\n\n<!-- Closes #250 -->" }),
    ).join(" "),
    /Related issue/,
  );
});

test("does not count an issue mentioned outside the Related issue section", () => {
  assert.match(
    auditPullRequest(
      event({ body: "## Related issue\n\nNone\n\n## Why\n\n#250" }),
    ).join(" "),
    /Related issue/,
  );
});

test("does not count references from fenced example code", () => {
  assert.match(
    auditPullRequest(
      event({ body: "## Related issue\n\n```\nCloses #250\n```" }),
    ).join(" "),
    /Related issue/,
  );
});

test("does not count another repository's issue URL or qualified reference", () => {
  for (const reference of [
    "https://github.com/example/other/issues/250",
    "example/other#250",
  ]) {
    assert.match(
      auditPullRequest(
        event({ body: `## Related issue\n\n${reference}` }),
      ).join(" "),
      /Related issue/,
    );
  }
});

test("requires each branch issue to be linked", () => {
  assert.match(
    auditPullRequest(
      event({ head: { ref: "fix/250-251-quality-gates" } }),
    ).join(" "),
    /each issue number/,
  );
});

test("rejects unnumbered, malformed and injection-shaped branch names", () => {
  for (const ref of [
    "fix/quality-gates",
    "fix/0-quality-gates",
    "fix/250-Quality",
    "fix/250-quality_",
    "fix/250-$(touch attack)",
  ]) {
    assert.match(
      auditPullRequest(event({ head: { ref } })).join(" "),
      /branch name/,
    );
  }
});

test("handles untrusted PR text as data", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        body: '## Related issue\n\nCloses #250\n\n## Why\n\n"; process.exit(99); //',
      }),
    ),
    [],
  );
});

test("allows development-to-main promotion with linked issues", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        base: { ref: "main" },
        head: {
          ref: developmentBranch,
          repo: { full_name: "ParasX1/Financial-Investment-Tool" },
        },
      }),
    ),
    [],
  );
});

test("does not treat a fork's identically named branch as a development promotion", () => {
  assert.match(
    auditPullRequest(
      event({
        base: { ref: "main" },
        head: {
          ref: developmentBranch,
          repo: { full_name: "fork-owner/Financial-Investment-Tool" },
        },
      }),
    ).join(" "),
    /development branch/,
  );
});

test("rejects a feature PR straight to main", () => {
  assert.match(
    auditPullRequest(event({ base: { ref: "main" } })).join(" "),
    /development branch/,
  );
});

test("requires a documented emergency exception for a main hotfix", () => {
  const hotfix = { base: { ref: "main" }, head: { ref: "hotfix/250-build" } };
  assert.match(
    auditPullRequest(event(hotfix)).join(" "),
    /Emergency exception/,
  );
  assert.deepEqual(
    auditPullRequest(
      event({
        ...hotfix,
        body: "## Related issue\n\nFixes #250\n\n## Emergency exception\n\nProduction is unavailable; the release maintainer must review and approve this exception.",
      }),
    ),
    [],
  );
});

test("handles a missing PR payload and rejects unsupported target branches", () => {
  assert.match(auditPullRequest({}).join(" "), /pull request event/);
  assert.match(
    auditPullRequest(event({ base: { ref: "other" } })).join(" "),
    /target branch/,
  );
});

test("CLI reads the event as JSON and reports its real exit status", () => {
  const directory = mkdtempSync(join(tmpdir(), "finance-pr-policy-"));
  const eventPath = join(directory, "event.json");
  const script = fileURLToPath(
    new URL("./check-pr-policy.mjs", import.meta.url),
  );
  const run = (value) => {
    writeFileSync(eventPath, value);
    return spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
  };
  try {
    const success = run(JSON.stringify(event()));
    assert.equal(success.status, 0);
    assert.match(success.stdout, /follow the contribution policy/);
    const failure = run(JSON.stringify(event({ body: "" })));
    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /::error::Fill the Related issue/);
    const malformed = run("invalid JSON");
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /Could not read a valid pull request event/);
    const missingPath = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: "" },
    });
    assert.equal(missingPath.status, 1);
    assert.match(
      missingPath.stderr,
      /Could not read a valid pull request event/,
    );
  } finally {
    unlinkSync(eventPath);
    rmdirSync(directory);
  }
});
