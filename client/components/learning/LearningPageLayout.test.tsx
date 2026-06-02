// File purpose: Smoke-tests shared Learning page layout semantics without browser-only test infrastructure.
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { LearningPageLayout } from "./LearningPageLayout";

jest.mock("@/components/shared/FitPageShell", () => {
  const React = require("react");

  return {
    FitPageShell({
      children,
      skipLabel,
      skipTargetId,
    }: {
      children: React.ReactNode;
      skipLabel: string;
      skipTargetId: string;
    }) {
      return (
        <div data-skip-label={skipLabel} data-skip-target-id={skipTargetId}>
          {children}
        </div>
      );
    },
  };
});

function TestIcon(_props: SvgIconProps) {
  return <span data-testid="test-icon" />;
}

function renderLearningLayout() {
  return renderToStaticMarkup(
    <LearningPageLayout
      activeId="alpha"
      navIcon={TestIcon}
      navItems={[
        {
          id: "alpha",
          label: "Alpha",
          description: "Alpha section",
          icon: TestIcon,
        },
        {
          id: "beta",
          label: "Beta",
          description: "Beta section",
          icon: TestIcon,
        },
      ]}
      navTitle="Guide topics"
      onNavChange={() => undefined}
      skipLabel="Skip to guide content"
      subtitle="Learn the shared layout"
      title="Guide"
    >
      <p>Current topic content</p>
    </LearningPageLayout>,
  );
}

function getNavHtml(html: string) {
  const match = html.match(/<nav aria-label="Guide topics">([\s\S]*?)<\/nav>/);

  if (!match) {
    throw new Error("Learning nav was not rendered with the expected label");
  }

  return match[0];
}

function getButtonHtmlForLabel(navHtml: string, label: string) {
  const buttons = navHtml.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
  const button = buttons.find((candidate) =>
    candidate.includes(`>${label}</span>`),
  );

  if (!button) {
    throw new Error(`Learning nav button was not rendered for ${label}`);
  }

  return button;
}

describe("LearningPageLayout", () => {
  it("renders the shared learning page landmarks and active nav state", () => {
    const html = renderLearningLayout();
    const navHtml = getNavHtml(html);
    const activeButtonHtml = getButtonHtmlForLabel(navHtml, "Alpha");
    const idleButtonHtml = getButtonHtmlForLabel(navHtml, "Beta");

    expect(html).toContain('data-skip-label="Skip to guide content"');
    expect(html).toContain('data-skip-target-id="main-content"');
    expect(html).toContain("<main");
    expect(html).toContain('id="main-content"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("<h1");
    expect(html).toContain(">Guide</h1>");
    expect(navHtml).toContain('aria-label="Guide topics"');
    expect(activeButtonHtml).toContain('aria-pressed="true"');
    expect(idleButtonHtml).toContain('aria-pressed="false"');
    expect(html).toContain("Current topic content");
  });
});
