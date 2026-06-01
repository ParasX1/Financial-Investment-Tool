import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "./MarkdownBody";

function renderMarkdown(text: string) {
  return renderToStaticMarkup(<MarkdownBody text={text} />);
}

describe("MarkdownBody", () => {
  it("renders combined bold and italic markdown", () => {
    expect(renderMarkdown("***important***")).toContain(
      "<strong><em>important</em></strong>",
    );
  });

  it("renders nested inline formatting inside supported wrappers", () => {
    const html = renderMarkdown(
      "**bold and *italic***\n~~**removed**~~\n[**docs**](https://example.com)\n***[source](https://example.com)***",
    );

    expect(html).toContain("<strong>bold and <em>italic</em></strong>");
    expect(html).toContain("<s><strong>removed</strong></s>");
    expect(html).toContain(
      '<a href="https://example.com/" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toContain("<strong>docs</strong>");
    expect(html).toContain(
      '<strong><em><a href="https://example.com/" target="_blank" rel="noopener noreferrer"',
    );
  });

  it("leaves unsafe inline links as text", () => {
    const html = renderMarkdown("[bad](javascript:alert%281%29)");

    expect(html).toContain("[bad](javascript:alert%281%29)");
    expect(html).not.toContain("<a");
  });

  it("supports pasted markdown destinations with balanced parentheses", () => {
    const html = renderMarkdown(
      "[Function](https://en.wikipedia.org/wiki/Function_(mathematics))\n![chart](https://cdn.example.com/chart(1).png)",
    );

    expect(html).toContain(
      'href="https://en.wikipedia.org/wiki/Function_(mathematics)"',
    );
    expect(html).toContain('src="https://cdn.example.com/chart(1).png"');
  });
});
