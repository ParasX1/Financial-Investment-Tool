import { expect, test } from "@playwright/test";

const examples = [
  { tool: "Top Picks", label: "A simple workflow" },
  { tool: "Watchlist", label: "Example research note" },
  { tool: "Market News", label: "A story in context" },
  { tool: "Guide", label: "From the guide" },
  { tool: "Community", label: "Example question" },
] as const;

for (const textScale of [1, 2]) {
  test(`keeps compact examples readable and non-interactive at ${textScale * 100}% text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    if (textScale === 2) {
      await page.addStyleTag({
        content: "html { font-size: 32px !important; }",
      });
    }
    const steps = page
      .getByRole("article", { name: "Top Picks", exact: true })
      .getByRole("list");
    await expect(steps.getByRole("listitem")).toHaveCount(3);
    // Tailwind resets list markers globally; the workflow needs visible order.
    await expect(steps).toHaveCSS("list-style-type", "decimal");
    for (const { tool, label } of examples) {
      const article = page.getByRole("article", { name: tool, exact: true });
      const example = article.getByText(label, { exact: true }).locator("..");
      await expect(example).toBeVisible();
      await expect(
        example.locator("a, button, input, select, textarea, [tabindex]"),
      ).toHaveCount(0);
      expect(
        await example.evaluate((element) => {
          const boundary = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()].every(
            (rect) =>
              rect.left >= boundary.left - 1 &&
              rect.right <= boundary.right + 1 &&
              rect.top >= boundary.top - 1 &&
              rect.bottom <= boundary.bottom + 1,
          );
        }),
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test.describe("compact examples without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("retains the examples and honest labels in the server response", async ({
    page,
  }) => {
    await page.goto("/");
    for (const { tool, label } of examples) {
      await expect(
        page
          .getByRole("article", { name: tool, exact: true })
          .getByText(label, {
            exact: true,
          }),
      ).toBeVisible();
    }
    await expect(
      page.getByText("When available", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Read the guide", exact: false }),
    ).toHaveAttribute("href", "/Guide");
  });
});
