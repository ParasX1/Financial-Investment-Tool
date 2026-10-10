// File purpose: Tests markdown rendering behavior and safety-sensitive output.
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "./MarkdownBody";

function renderMarkdown(text: string, allowedImageUrl?: string | null) {
  return renderToStaticMarkup(
    <MarkdownBody text={text} allowedImageUrl={allowedImageUrl} />,
  );
}

describe("MarkdownBody", () => {
  it("renders combined bold and italic markdown", () => {
    expect(renderMarkdown("***important***")).toMatch(
      /<(strong|em)><(em|strong)>important<\/\2><\/\1>/,
    );
  });

  it("renders nested inline formatting inside supported wrappers", () => {
    const html = renderMarkdown(
      "**bold and *italic***\n~~**removed**~~\n[**docs**](https://example.com)\n***[source](https://example.com)***",
    );

    expect(html).toContain("<strong>bold and <em>italic</em></strong>");
    expect(html).toContain("<del><strong>removed</strong></del>");
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("<strong>docs</strong>");
    expect(html).toMatch(
      /<(strong|em)><(em|strong)><a [^>]*href="https:\/\/example\.com\/"[^>]*>source<\/a><\/\2><\/\1>/,
    );
  });

  it("leaves unsafe inline links as text", () => {
    const html = renderMarkdown("[bad](javascript:alert%281%29)");

    expect(html).toContain("bad");
    expect(html).not.toContain("<a");
  });

  it("supports Reddit-style quotes, code, task lists, and tables", () => {
    const html = renderMarkdown(
      [
        "> Compare the evidence",
        "",
        "`P/E` is not a complete thesis.",
        "",
        "- [x] Read earnings",
        "- [ ] Check guidance",
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        "| Margin | 42% |",
        "",
        "```ts",
        "const risk = 2;",
        "```",
      ].join("\n"),
    );

    expect(html).toContain("<blockquote");
    expect(html).toMatch(/<code[^>]*>P\/E<\/code>/);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<table");
    expect(html).toContain("const risk = 2;");
  });

  it("ignores raw HTML and only loads the post-owned image", () => {
    const imageUrl = "https://cdn.example.com/owned-chart.png";
    const unsafeHtml = renderMarkdown(
      '<script>alert("xss")</script><img src="https://tracker.example/pixel.png">',
    );
    const unownedImage = renderMarkdown(
      "![tracker](https://tracker.example/pixel.png)",
      imageUrl,
    );
    const ownedImage = renderMarkdown(`![chart](${imageUrl})`, imageUrl);

    expect(unsafeHtml).not.toContain("<script");
    expect(unsafeHtml).not.toContain("<img");
    expect(unownedImage).not.toContain("<img");
    expect(unownedImage).toContain("Image unavailable");
    expect(ownedImage).toContain(`src="${imageUrl}"`);
  });

  it("does not reinterpret an incomplete collapsed link as different markup", () => {
    const html = renderToStaticMarkup(
      <MarkdownBody
        text="Read [this](https://example..."
        optimizeForStreaming
      />,
    );

    expect(html).toContain("Read this");
    expect(html).not.toContain("<a");
  });
});
