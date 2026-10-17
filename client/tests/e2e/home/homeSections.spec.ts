import { expect, test } from "@playwright/test";

const groups = [
  {
    id: "analyse",
    title: "Analyse an idea",
    tools: ["Portfolio", "Top Picks"],
  },
  {
    id: "follow",
    title: "Follow your research",
    tools: ["Watchlist", "Market News"],
  },
  {
    id: "experience",
    title: "Learn and exchange views",
    tools: ["Guide", "Community"],
  },
] as const;

for (const width of [320, 1440]) {
  test(`makes task groups and their tools discoverable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overview = page.getByRole("navigation", {
      name: "Explore the tools",
      exact: true,
    });
    await expect(overview.getByRole("link")).toHaveCount(3);
    for (const group of groups) {
      const section = page.locator(`#${group.id}`);
      const heading = section.getByRole("heading", {
        level: 2,
        name: group.title,
        exact: true,
      });
      await expect(heading).toHaveCount(1);
      await expect(section.getByRole("heading", { level: 3 })).toHaveText([
        ...group.tools,
      ]);
      for (const tool of group.tools) {
        await expect(overview.locator(`a[href="#${group.id}"]`)).toContainText(
          tool,
        );
      }
      await overview.locator(`a[href="#${group.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${group.id}$`));
      await expect(heading).toBeInViewport();
    }
    const learning = page.locator("#experience");
    await expect(
      learning.getByRole("link", { name: "Read the guide", exact: false }),
    ).toHaveAttribute("href", "/Guide");
    await expect(
      learning.getByRole("button", {
        name: "Explore community, sign in required",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "Visit Help Center", exact: false }),
    ).toHaveAttribute("href", "/Help");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
