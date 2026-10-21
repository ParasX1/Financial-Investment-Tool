import { expect, test, type Locator } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

const links = [
  { name: "Product", href: "#product" },
  { name: "Tools", href: "#research-tasks" },
  { name: "Guide", href: "/Guide" },
  { name: "Help", href: "/Help" },
] as const;

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === new URL(baseURL!).origin &&
      !url.pathname.startsWith("/api/")
      ? route.continue()
      : route.abort();
  });
});

async function publicLinks(nav: Locator) {
  for (const link of links) {
    const control = nav.getByRole("link", { name: link.name, exact: true });
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute("href", link.href);
  }
}

async function touchTargets(nav: Locator) {
  for (const link of links) {
    const control = nav.getByRole("link", { name: link.name, exact: true });
    const bounds = await control.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
  }
}

for (const width of [320, 390, 820, 1440, 2560, 3440]) {
  for (const scale of [1, 2]) {
    test(`keeps guest navigation legible at ${width}px and ${scale * 100}% text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Home", exact: true });
      await expect(
        nav.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      if (scale === 2)
        await page.addStyleTag({
          content: "html { font-size: 32px !important; }",
        });
      await publicLinks(nav);
      await touchTargets(nav);
      await expect(
        nav.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      const brand = nav.getByRole("link", {
        name: "Go to FIT home",
        exact: true,
      });
      await expect(brand).toHaveAttribute("href", "#top");
      if (scale === 1 && width >= 1440) {
        const first = await nav
          .getByRole("link", { name: "Product", exact: true })
          .boundingBox();
        const last = await nav
          .getByRole("link", { name: "Help", exact: true })
          .boundingBox();
        const box = await nav.boundingBox();
        const linkCenter = (first!.x + last!.x + last!.width) / 2;
        expect(Math.abs(linkCenter - (box!.x + box!.width / 2))).toBeLessThan(
          2,
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

for (const width of [320, 1440]) {
  test(`preserves restored-user navigation at ${width}px with enlarged text`, async ({
    page,
  }) => {
    await installWatchlistMockBackend(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Home", exact: true });
    const action = nav.getByRole("link", {
      name: "Open portfolio",
      exact: true,
    });
    await expect(action).toHaveAttribute("href", "/Portfolio");
    await page.addStyleTag({ content: "html {font-size:32px !important}" });
    await publicLinks(nav);
    await touchTargets(nav);
    await expect(action).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("opens the task area from the navbar while guest route intent remains gated", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Home", exact: true })
    .getByRole("link", { name: "Tools", exact: true })
    .click();
  await expect(page).toHaveURL(/#research-tasks$/);
  const tasks = page.locator("#research-tasks");
  await expect(tasks.getByRole("heading", { level: 2 })).toBeInViewport();
  const action = tasks.getByRole("button", {
    name: "Explore top picks, sign in required",
    exact: true,
  });
  await action.click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Welcome back");
});

test.describe("navigation without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("keeps every public destination available and the Tools anchor native", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Home", exact: true });
    await publicLinks(nav);
    await expect(
      nav.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
    await nav.getByRole("link", { name: "Tools", exact: true }).click();
    await expect(page).toHaveURL(/#research-tasks$/);
    await expect(
      page.locator("#research-tasks").getByRole("heading", { level: 2 }),
    ).toBeInViewport();
  });
});
