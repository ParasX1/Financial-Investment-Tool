import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const developmentBranch = "DevBranch";
const issueBranch =
  /^(feature|fix|refactor|docs|chore|test|perf|ci|hotfix)\/([1-9]\d*(?:-[1-9]\d*)*)-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function section(body, title) {
  const source = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[^\n]*\n[\s\S]*?```/g, "")
    .replace(/~~~[^\n]*\n[\s\S]*?~~~/g, "");
  const heading = new RegExp(`^#{1,6}\\s+${title}\\s*$`, "im");
  const match = heading.exec(source);
  if (!match) return "";
  return source
    .slice(match.index + match[0].length)
    .split(/^#{1,6}\s+/m)[0]
    .trim();
}

function linkedIssues(body, repository) {
  const related = section(body, "Related issues?");
  const numbers = new Set();
  // Qualified references to other repositories must not satisfy a local issue link.
  for (const match of related.matchAll(/(?<![\w/.])#([1-9]\d*)\b/g)) {
    numbers.add(match[1]);
  }
  for (const match of related.matchAll(
    /https:\/\/github\.com\/([^\s/]+\/[^\s/]+)\/issues\/([1-9]\d*)\b/g,
  )) {
    if (match[1].toLowerCase() === repository.toLowerCase())
      numbers.add(match[2]);
  }
  return numbers;
}

/** Audit metadata syntax only. Human review still verifies the issue and approval. */
export function auditPullRequest(event) {
  const pr = event.pull_request;
  if (!pr) return ["Expected a pull request event payload."];
  const errors = [];
  const body = pr.body ?? "";
  const repository = event.repository?.full_name ?? "";
  const issues = linkedIssues(body, repository);
  if (!issues.size) {
    errors.push(
      "Fill the Related issue section with a local #number or repository issue URL.",
    );
  }

  const base = pr.base?.ref;
  const head = pr.head?.ref ?? "";
  const promotion =
    base === "main" &&
    head === developmentBranch &&
    repository !== "" &&
    pr.head?.repo?.full_name?.toLowerCase() === repository.toLowerCase();
  const match = issueBranch.exec(head);
  if (!promotion && !match) {
    errors.push(
      "Use an issue-number branch name, such as fix/250-quality-gates.",
    );
  }
  if (match && match[2].split("-").some((number) => !issues.has(number))) {
    errors.push(
      "Link each issue number from the branch name in the Related issue section.",
    );
  }

  if (base !== developmentBranch && base !== "main") {
    errors.push("The pull request target branch must be DevBranch or main.");
  }
  if (base === "main" && !promotion) {
    if (match?.[1] !== "hotfix") {
      errors.push(
        "Promote the reviewed development branch to main; feature work targets DevBranch.",
      );
    } else if (!section(body, "Emergency exception")) {
      errors.push(
        "Explain the main hotfix in an Emergency exception section and obtain release approval.",
      );
    }
  }
  return errors;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    if (!process.env.GITHUB_EVENT_PATH)
      throw new Error("GITHUB_EVENT_PATH is required.");
    const errors = auditPullRequest(
      JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
    );
    for (const error of errors) console.error(`::error::${error}`);
    if (errors.length) process.exitCode = 1;
    else
      console.log(
        "PR issue references, branch name and target follow the contribution policy.",
      );
  } catch {
    console.error(
      "::error::Could not read a valid pull request event from GITHUB_EVENT_PATH.",
    );
    process.exitCode = 1;
  }
}
