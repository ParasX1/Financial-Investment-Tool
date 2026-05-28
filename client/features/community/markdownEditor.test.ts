import {
  DRAFT_IMAGE_MARKER,
  applyMarkdownCommand,
  insertMarkdownImage,
  insertMarkdownLink,
  normalizeMarkdownUrl,
  removeDraftImageMarkers,
  replaceDraftImageMarkers,
} from "./markdownEditor";

describe("Community markdown editor helpers", () => {
  it("wraps selected text with inline formatting", () => {
    expect(
      applyMarkdownCommand("alpha beta", { start: 6, end: 10 }, "bold").value,
    ).toBe("alpha **beta**");
    expect(
      applyMarkdownCommand("alpha beta", { start: 6, end: 10 }, "strike")
        .value,
    ).toBe("alpha ~~beta~~");
  });

  it("prefixes selected lines for heading and lists", () => {
    expect(
      applyMarkdownCommand("line one\nline two", { start: 0, end: 17 }, "bullet")
        .value,
    ).toBe("- line one\n- line two");
    expect(
      applyMarkdownCommand("line one\nline two", { start: 0, end: 17 }, "numbered")
        .value,
    ).toBe("1. line one\n2. line two");
    expect(
      applyMarkdownCommand("line one", { start: 0, end: 8 }, "heading").value,
    ).toBe("## line one");
  });

  it("inserts validated markdown links", () => {
    const result = insertMarkdownLink(
      "Read this",
      { start: 5, end: 9 },
      "",
      "example.com/article",
    );

    expect(result.value).toBe("Read [this](https://example.com/article)");
    expect(normalizeMarkdownUrl("javascript:alert(1)").error).toBe(
      "Enter a valid http, https, or mailto URL.",
    );
    expect(
      insertMarkdownLink(
        "",
        { start: 0, end: 0 },
        "Function",
        "https://en.wikipedia.org/wiki/Function_(mathematics)",
      ).value,
    ).toBe(
      "[Function](https://en.wikipedia.org/wiki/Function_%28mathematics%29)",
    );
  });

  it("inserts and replaces one draft image marker", () => {
    const inserted = insertMarkdownImage(
      "before after",
      { start: 7, end: 7 },
      "chart.png",
    );

    expect(inserted.value).toBe(
      `before ![chart](${DRAFT_IMAGE_MARKER})\nafter`,
    );
    expect(
      replaceDraftImageMarkers(inserted.value, "https://cdn.example/chart.png"),
    ).toBe("before ![chart](https://cdn.example/chart.png)\nafter");
    expect(removeDraftImageMarkers(inserted.value)).toBe("before after");
  });
});
