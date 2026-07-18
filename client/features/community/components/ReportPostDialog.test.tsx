import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import { ReportPostDialog } from "./ReportPostDialog";

describe("ReportPostDialog", () => {
  it("explains privacy and constrains the moderation input", () => {
    const html = renderToStaticMarkup(
      <ReportPostDialog
        postId="post-1"
        busy={false}
        onCancel={jest.fn()}
        onSubmit={jest.fn<any>()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Report this discussion");
    expect(html).toContain("Only moderators can review the report");
    expect(html).toContain("Misleading financial claim");
    expect(html).toContain('maxLength="500"');
  });

  it("renders nothing until a report is requested", () => {
    expect(
      renderToStaticMarkup(
        <ReportPostDialog
          postId={null}
          busy={false}
          onCancel={jest.fn()}
          onSubmit={jest.fn<any>()}
        />,
      ),
    ).toBe("");
  });
});
