import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const developmentBranch = "DevBranch";

function prose(body) {
  const output = [];
  let paragraph = [];
  let paragraphQuoteDepth = 0;
  let fence;
  let inComment = false;

  // Inline code can span soft line breaks, but cannot cross a block boundary.
  // Scan comments in context so a literal <!-- inside code cannot open one.
  function inlineProse(source) {
    let result = "";
    let cursor = 0;
    const tokens = /\\[\\`<]|`+|<!--/g;
    while (cursor < source.length) {
      if (inComment) {
        const end = source.indexOf("-->", cursor);
        if (end === -1) return result;
        inComment = false;
        cursor = end + 3;
        continue;
      }
      tokens.lastIndex = cursor;
      const token = tokens.exec(source);
      if (!token) return result + source.slice(cursor);
      result += source.slice(cursor, token.index);
      cursor = token.index + token[0].length;
      if (token[0] === "<!--") {
        inComment = true;
      } else if (token[0].startsWith("\\")) {
        result += token[0];
      } else {
        let closing;
        for (const candidate of source.slice(cursor).matchAll(/`+/g)) {
          if (candidate[0] === token[0]) {
            closing = candidate;
            break;
          }
        }
        if (closing) cursor += closing.index + closing[0].length;
        else result += token[0];
      }
    }
    return result;
  }

  function flushParagraph() {
    if (paragraph.length) output.push(inlineProse(paragraph.join("\n")));
    paragraph = [];
  }

  for (const line of body.split(/\r?\n/)) {
    if (inComment) {
      output.push(inlineProse(line));
      continue;
    }
    // Keep quoted headings quoted; remove quote prefixes only for fence detection.
    let content = line;
    let quoteDepth = 0;
    let quote;
    while ((quote = /^ {0,3}>[ \t]?/.exec(content))) {
      content = content.slice(quote[0].length);
      quoteDepth++;
    }
    if (paragraph.length && quoteDepth !== paragraphQuoteDepth)
      flushParagraph();
    if (inComment) {
      output.push(inlineProse(line));
      continue;
    }
    if (
      fence &&
      (quoteDepth < fence.quoteDepth ||
        (fence.listIndent &&
          content.trim() &&
          !content.startsWith(" ".repeat(fence.listIndent))))
    )
      fence = undefined;
    if (fence) {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(
        content.slice(fence.listIndent),
      );
      if (
        quoteDepth === fence.quoteDepth &&
        marker &&
        marker[1][0] === fence.marker[0] &&
        marker[1].length >= fence.marker.length &&
        !marker[2].trim()
      )
        fence = undefined;
      output.push("");
      continue;
    }
    // Four-space/tab code blocks cannot interrupt an existing paragraph.
    if (!paragraph.length && /^(?: {4}|\t)/.test(content)) {
      output.push("");
      continue;
    }
    const list = /^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/.exec(content);
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(
      list ? content.slice(list[0].length) : content,
    );
    const opensFence =
      marker && (marker[1][0] !== "`" || !marker[2].includes("`"));
    const boundary =
      !content.trim() ||
      /^ {0,3}(?:#{1,6}(?:[ \t]|$)|<!--)/.test(content) ||
      /^ {0,3}(?:=+|-+)[ \t]*$/.test(content);
    if (opensFence || boundary || list) {
      flushParagraph();
      if (inComment) output.push(inlineProse(line));
      else if (opensFence) {
        fence = {
          marker: marker[1],
          quoteDepth,
          listIndent: list?.[0].length ?? 0,
        };
        output.push("");
      } else if (list) {
        paragraph.push(line);
        paragraphQuoteDepth = quoteDepth;
      } else output.push(inlineProse(line));
    } else {
      paragraph.push(line);
      paragraphQuoteDepth = quoteDepth;
    }
  }
  flushParagraph();
  return output.join("\n");
}

function section(source, title) {
  const heading = new RegExp(`^ {0,3}(#{1,6})[ \\t]+${title}\\s*#*\\s*$`, "im");
  const match = heading.exec(source);
  if (!match) return "";
  let content = source.slice(match.index + match[0].length);
  for (const next of content.matchAll(/^ {0,3}(#{1,6})[ \t]+\S.*$/gm)) {
    if (next[1].length <= match[1].length) {
      content = content.slice(0, next.index);
      break;
    }
  }
  return content.replace(/^ {0,3}#{1,6}[ \t]+.*$/gm, "").trim();
}

function linkedIssues(source, repository) {
  const numbers = new Set();
  // Remove URLs and qualified references before considering bare local #numbers.
  const unqualified = source
    .replace(/https?:\/\/[^\s<>()]+/gi, (reference) => {
      let url;
      try {
        url = new URL(reference.replace(/[.,;!:]+$/, ""));
      } catch {
        return "";
      }
      const match = /^\/([^/]+\/[^/]+)\/issues\/([1-9]\d*)\/?$/.exec(
        url.pathname,
      );
      if (
        url.protocol === "https:" &&
        url.hostname === "github.com" &&
        match?.[1].toLowerCase() === repository.toLowerCase()
      )
        numbers.add(match[2]);
      return "";
    })
    .replace(
      /(?<![\w/.-])([\w.-]+\/[\w.-]+)#([1-9]\d*)\b/g,
      (_, name, number) => {
        if (name.toLowerCase() === repository.toLowerCase())
          numbers.add(number);
        return "";
      },
    );
  for (const match of unqualified.matchAll(/(?<![\w/.#-])#([1-9]\d*)\b/g)) {
    numbers.add(match[1]);
  }
  return numbers;
}

/** Report syntax guidance and release gates; human review verifies issues and approval. */
export function inspectPullRequest(event) {
  const pr = event?.pull_request;
  if (!pr || typeof pr !== "object" || Array.isArray(pr))
    return {
      errors: ["Expected a pull request event payload."],
      warnings: [],
      issues: [],
    };
  const errors = [];
  const warnings = [];
  const source = prose(typeof pr.body === "string" ? pr.body : "");
  const repository =
    typeof event.repository?.full_name === "string"
      ? event.repository.full_name
      : "";
  const issues = linkedIssues(source, repository);
  if (!issues.size) {
    warnings.push(
      "Link a related local issue in the PR description when available (#number, owner/repo#number or repository issue URL). Reviewers verify its relevance.",
    );
  }

  const base = pr.base?.ref;
  const head = typeof pr.head?.ref === "string" ? pr.head.ref : "";
  const headRepository =
    typeof pr.head?.repo?.full_name === "string" ? pr.head.repo.full_name : "";
  const promotion =
    base === "main" &&
    head === developmentBranch &&
    repository !== "" &&
    headRepository.toLowerCase() === repository.toLowerCase();

  if (base !== developmentBranch && base !== "main") {
    errors.push("The pull request target branch must be DevBranch or main.");
  }
  if (base === "main" && !promotion) {
    if (!/^hotfix\/\S+$/.test(head)) {
      errors.push(
        "Promote the reviewed development branch to main; feature work targets DevBranch.",
      );
    } else if (!section(source, "Emergency exception")) {
      errors.push(
        "Explain the main hotfix in an Emergency exception section and obtain release approval.",
      );
    }
  }
  return { errors, warnings, issues: [...issues] };
}

/** Keep the public errors-only API for callers that determine whether to block. */
export function auditPullRequest(event) {
  return inspectPullRequest(event).errors;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    if (!process.env.GITHUB_EVENT_PATH)
      throw new Error("GITHUB_EVENT_PATH is required.");
    const { errors, warnings } = inspectPullRequest(
      JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
    );
    for (const warning of warnings) console.warn(`::warning::${warning}`);
    for (const error of errors) console.error(`::error::${error}`);
    if (errors.length) process.exitCode = 1;
    else
      console.log(
        "PR target follows the contribution policy. Issue-link guidance is advisory; reviewers verify references and release approval.",
      );
  } catch {
    console.error(
      "::error::Could not read a valid pull request event from GITHUB_EVENT_PATH.",
    );
    process.exitCode = 1;
  }
}
