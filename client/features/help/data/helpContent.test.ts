import { describe, expect, it } from "@jest/globals";
import { helpSections } from "./helpContent";

function sectionCopy(sectionId: string) {
  const section = helpSections.find(({ id }) => id === sectionId);

  expect(section).toBeDefined();
  return section!.faqs
    .map(({ question, answer }) => `${question} ${answer}`)
    .join(" ");
}

describe("helpContent", () => {
  it("describes account access without unsupported security guarantees", () => {
    const copy = sectionCopy("login-signup");

    expect(copy).toMatch(/Start free today.*Create an account/i);
    expect(copy).toMatch(/confirmation email may be required/i);
    expect(copy).toMatch(/Google OAuth/i);
    expect(copy).toMatch(/Supabase Auth/i);
    expect(copy).not.toMatch(/AES-256|TLS 1\.3|never share/i);
  });

  it("describes the current Portfolio analytics controls", () => {
    const copy = sectionCopy("portfolio");

    expect(copy).toMatch(/compare up to 5 stocks/i);
    expect(copy).toMatch(/switch.*main view.*fullscreen.*clear/i);
    expect(copy).toMatch(/10 analytics views/i);
    expect(copy).toMatch(/ticker symbol/i);
    expect(copy).not.toMatch(/manage stocks/i);
    expect(copy).not.toMatch(/company name/i);
  });

  it("distinguishes working Top Picks tools from local-only placeholders", () => {
    const copy = sectionCopy("top-picks");
    const section = helpSections.find(({ id }) => id === "top-picks");

    expect(copy).toMatch(/selected metric/i);
    expect(copy).toMatch(/visible columns/i);
    expect(copy).toMatch(/stored only in this browser/i);
    expect(section?.subtitle).not.toMatch(/recommendation/i);
    expect(copy).not.toMatch(
      /proprietary algorithm|updated daily|daily, weekly, or monthly/i,
    );
  });

  it("points Community users to the dedicated create workflow", () => {
    const copy = sectionCopy("community");

    expect(copy).toMatch(/Create post.*Community Create/i);
    expect(copy).toMatch(/votes.*investment signal.*recency/i);
    expect(copy).not.toMatch(
      /text box at the top|Posts violating guidelines will be removed/i,
    );
  });

  it("documents news refresh boundaries without promising instant freshness", () => {
    const copy = sectionCopy("market-news");

    expect(copy).toMatch(/about every three minutes/i);
    expect(copy).toMatch(/return to the tab/i);
    expect(copy).toMatch(/cache/i);
    expect(copy).toMatch(/provider.*delay/i);
    expect(copy).not.toMatch(/deep link.*fresh/i);
  });

  it("describes the adaptive Watchlist monitor cadence and delay boundary", () => {
    const copy = sectionCopy("watchlist");

    expect(copy).toMatch(/15 seconds.*30 seconds/i);
    expect(copy).toMatch(/30 seconds.*60 seconds/i);
    expect(copy).toMatch(/five minutes/i);
    expect(copy).toMatch(/may be delayed/i);
    expect(copy).not.toMatch(/actually hold/i);
  });

  it("describes Profile operations as separate save flows", () => {
    const copy = sectionCopy("profile");

    expect(copy).toMatch(/avatar.*uploads and saves/i);
    expect(copy).toMatch(/identity, email, and phone.*separate/i);
    expect(copy).toMatch(/Change password/i);
    expect(copy).not.toMatch(/Save profile|Security section/i);
  });
});
