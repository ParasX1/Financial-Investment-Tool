import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { auditPullRequest, inspectPullRequest } from "./check-pr-policy.mjs";

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

test("reports missing issue linkage as advisory rather than blocking", () => {
  const result = inspectPullRequest(
    event({ body: "## Related issue\n\n<!-- Closes #250 -->" }),
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.issues, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /local issue/);
});

test("counts an issue mentioned outside the Related issue section", () => {
  assert.deepEqual(
    inspectPullRequest(
      event({ body: "## Related issue\n\nNone\n\n## Why\n\n#250" }),
    ),
    { errors: [], warnings: [], issues: ["250"] },
  );
});

test("does not count references from fenced, inline or commented examples", () => {
  for (const body of [
    "## Related issue\n\n```\nCloses #250\n```",
    "~~~markdown\nCloses #250\n~~~",
    "````markdown\n```\nCloses #250\n```\n````",
    "Example: `Closes #250`",
    "<!-- Example #250 -->",
    "<!-- Unfinished comment #250",
    "```\nUnfinished example #250",
  ]) {
    const result = inspectPullRequest(event({ body }));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.issues, []);
    assert.equal(result.warnings.length, 1);
  }
});

test("does not count another repository's issue URL or qualified reference", () => {
  for (const reference of [
    "https://github.com/example/other/issues/250",
    "example/other#250",
    "https://github.com/ParasX1/Financial-Investment-Tool/pull/250",
    "https://github.com.example.com/ParasX1/Financial-Investment-Tool/issues/250",
    "https://example.com/tracking#250",
  ]) {
    const result = inspectPullRequest(event({ body: reference }));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.issues, []);
    assert.equal(result.warnings.length, 1);
  }
});

test("does not require issue numbers in branch names to match prose", () => {
  assert.deepEqual(
    auditPullRequest(event({ head: { ref: "fix/250-251-quality-gates" } })),
    [],
  );
});

test("branch naming does not block development and untrusted refs remain data", () => {
  for (const ref of [
    "fix/quality-gates",
    "fix/0-quality-gates",
    "fix/250-Quality",
    "fix/250-quality_",
    "fix/250-$(touch attack)",
  ]) {
    assert.deepEqual(auditPullRequest(event({ head: { ref } })), []);
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
    assert.match(success.stdout, /follows the contribution policy/);
    const advisory = run(JSON.stringify(event({ body: "" })));
    assert.equal(advisory.status, 0);
    assert.match(advisory.stderr, /::warning::Link a related local issue/);
    const failure = run(JSON.stringify(event({ base: { ref: "main" } })));
    assert.equal(failure.status, 1);
    assert.match(
      failure.stderr,
      /::error::Promote the reviewed development branch/,
    );
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

test("accepts a descriptive branch with a local issue in ordinary prose", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        head: { ref: "fix/quality-gates" },
        body: "Restores CI for #285.",
      }),
    ),
    [],
  );
});

test("accepts local issue references under nested or alternative headings", () => {
  for (const body of [
    "## Related issue\n### Tracking\nCloses #250.",
    "## Context\n\nRelates to #250.",
  ]) {
    assert.deepEqual(auditPullRequest(event({ body })), []);
  }
});

test("missing issue linkage and branch-number mismatch do not block development", () => {
  assert.deepEqual(
    auditPullRequest(event({ body: "Small maintenance change." })),
    [],
  );
  assert.deepEqual(
    auditPullRequest(event({ head: { ref: "fix/250-251-quality-gates" } })),
    [],
  );
});

test("accepts a descriptive main hotfix with a nested emergency explanation", () => {
  assert.deepEqual(
    auditPullRequest(
      event({
        base: { ref: "main" },
        head: { ref: "hotfix/restore-build" },
        body: "Fixes #250\n## Emergency exception\n### Impact\nProduction is unavailable; the release owner will review.",
      }),
    ),
    [],
  );
});

test("recognizes local shorthand, qualified references and issue URLs throughout prose", () => {
  const result = inspectPullRequest(
    event({
      body: "Context for #250 and ParasX1/Financial-Investment-Tool#251.\nSee https://github.com/parasx1/financial-investment-tool/issues/252.\nAlso https://github.com/ParasX1/Financial-Investment-Tool/issues/250#issuecomment-1 and #250.",
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(new Set(result.issues), new Set(["250", "251", "252"]));
});

test("template examples do not hide a real issue later in the description", () => {
  const result = inspectPullRequest(
    event({
      body: "<!-- Closes #123 -->\n~~~\n#124\n~~~\nThe actual fix relates to #250.",
    }),
  );
  assert.deepEqual(result, { errors: [], warnings: [], issues: ["250"] });
});

test("ignores malformed URLs and non-issue numbers without throwing", () => {
  const result = inspectPullRequest(
    event({
      body: "See https://[invalid and #0, #250abc, user@example.com/#251 or ##252.",
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.issues, []);
  assert.equal(result.warnings.length, 1);
});

test("an emergency heading, examples or another section cannot supply the explanation", () => {
  for (const body of [
    "## Emergency exception\n### Impact\n## Verification\nTests passed.",
    "## Emergency exception\n<!-- Explain the outage -->",
    "## Emergency exception\n```\nProduction is unavailable.\n```",
    "## Emergency exception\n`Production is unavailable.`",
  ]) {
    assert.match(
      auditPullRequest(
        event({ base: { ref: "main" }, head: { ref: "hotfix/build" }, body }),
      ).join(" "),
      /Emergency exception/,
    );
  }
});

test("same-repository main promotion does not require a branch number or issue section", () => {
  assert.deepEqual(
    inspectPullRequest(
      event({
        base: { ref: "main" },
        head: {
          ref: developmentBranch,
          repo: { full_name: "parasx1/financial-investment-tool" },
        },
        body: "Release the reviewed development branch.",
      }),
    ).errors,
    [],
  );
});

test("missing repository identity does not establish a trusted main promotion", () => {
  const payload = event({
    base: { ref: "main" },
    head: { ref: developmentBranch },
  });
  delete payload.repository;
  assert.match(auditPullRequest(payload).join(" "), /development branch/);
});

test("handles absent or malformed metadata without treating text as executable input", () => {
  for (const payload of [
    undefined,
    null,
    {},
    { pull_request: [] },
    { pull_request: "text" },
  ]) {
    assert.match(auditPullRequest(payload).join(" "), /pull request event/);
  }
  const result = inspectPullRequest({
    repository: { full_name: 123 },
    pull_request: {
      base: { ref: developmentBranch },
      head: { ref: 123, repo: { full_name: 123 } },
      body: null,
    },
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
});

test("literal comment markers inside code cannot hide a later emergency explanation", () => {
  for (const introduction of [
    "Reject the literal `<!--` token.",
    "```text\n<!--\n```",
    "Reject the literal ``<!-- ` token``.",
    "The literal `comment marker\nincluding <!--` is shown across a soft line break.",
    "Reject the escaped \\<!-- token.",
    "    <!--",
  ]) {
    const result = inspectPullRequest(
      event({
        base: { ref: "main" },
        head: { ref: "hotfix/build" },
        body: `${introduction}\n\n## Emergency exception\n\nProduction is unavailable; Li will review.`,
      }),
    );
    assert.deepEqual(result.errors, [], introduction);
  }
});

test("unmatched inline code cannot consume a later paragraph or emergency heading", () => {
  const result = inspectPullRequest(
    event({
      base: { ref: "main" },
      head: { ref: "hotfix/build" },
      body: "An unmatched ` token.\n\n## Emergency exception\n\nProduction is unavailable; Li will review. Run `npm test`.",
    }),
  );
  assert.deepEqual(result.errors, []);
});

test("quoted fenced examples do not count as local issue links", () => {
  for (const body of [
    "> ~~~\n> Closes #250\n> ~~~",
    "> > ~~~\n> > Closes #250\n> > ~~~",
    "> - ~~~\n>   Closes #250\n>   ~~~",
    "1. ~~~\n   Closes #250\n   ~~~",
  ]) {
    const result = inspectPullRequest(event({ body }));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.issues, []);
    assert.equal(result.warnings.length, 1);
  }
});

test("actual comments ignore code markers and cannot expose example issues", () => {
  const result = inspectPullRequest(
    event({ body: "<!--\n~~~\nCloses #123 and `#124`.\n-->\nFixes #250." }),
  );
  assert.deepEqual(result, { errors: [], warnings: [], issues: ["250"] });
});

test("a comment block takes precedence over an unmatched inline code opener", () => {
  assert.match(
    auditPullRequest(
      event({
        base: { ref: "main" },
        head: { ref: "hotfix/build" },
        body: "An unmatched ` opener\n<!--` begins a comment block.\n\n## Emergency exception\nThe explanation is inside the unclosed comment.",
      }),
    ).join(" "),
    /Emergency exception/,
  );
});

test("unclosed container examples stop before later real prose", () => {
  for (const introduction of ["> ~~~\n> #123", "- ~~~\n  #123"]) {
    const result = inspectPullRequest(
      event({
        base: { ref: "main" },
        head: { ref: "hotfix/build" },
        body: `${introduction}\n\n## Emergency exception\nFixes #250; production is unavailable and Li will review.`,
      }),
    );
    assert.deepEqual(result, { errors: [], warnings: [], issues: ["250"] });
  }
});

test("inline code respects list boundaries and soft line breaks within an item", () => {
  const result = inspectPullRequest(
    event({
      body: "- Example: `Closes\n  #123`\n- The actual change fixes #250.",
    }),
  );
  assert.deepEqual(result, { errors: [], warnings: [], issues: ["250"] });
});

test("Setext heading boundaries prevent unmatched code from consuming later issue prose", () => {
  for (const underline of ["===", "---"]) {
    const result = inspectPullRequest(
      event({
        body: `An unmatched \` token\n${underline}\nFixes #250 using \`code\`.`,
      }),
    );
    assert.deepEqual(result, { errors: [], warnings: [], issues: ["250"] });
  }
});
