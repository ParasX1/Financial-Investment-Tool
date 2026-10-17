import { expect, test } from "@playwright/test";

const tasks = [
  {
    id: "discover",
    title: "Find a company to research",
    actions: ["Explore top picks"],
  },
  {
    id: "follow",
    title: "Follow your research",
    actions: ["Open watchlist", "Read market news"],
  },
  {
    id: "experience",
    title: "Understand what you find",
    actions: ["Explore community"],
  },
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

for (const width of [320, 390, 820, 1440, 3440]) {
  for (const scale of [1, 2]) {
    test(`keeps each task and tool readable at ${width}px with ${scale * 100}% text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      const section = page.locator("#research-tasks");
      await expect(
        section.getByRole("button", {
          name: "Explore top picks, sign in required",
          exact: true,
        }),
      ).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      if (scale === 2)
        await page.addStyleTag({
          content: "html { font-size: 32px !important; }",
        });
      for (const metric of ["return", "volatility", "drawdown"]) {
        await expect(
          page
            .locator(
              `[data-research-metric="${metric}"] [data-research-chart] svg path`,
            )
            .first(),
        ).toBeVisible();
      }
      await expect(
        section.getByRole("heading", {
          level: 2,
          name: "What would you like to do?",
          exact: true,
        }),
      ).toBeVisible();
      await expect(section.getByRole("heading", { level: 3 })).toHaveText(
        tasks.map(({ title }) => title),
      );
      for (const task of tasks) {
        const row = section.locator(`#${task.id}`);
        await expect(
          row.getByRole("heading", { level: 3, name: task.title, exact: true }),
        ).toBeVisible();
        for (const label of task.actions)
          await expect(
            row.getByRole("button", {
              name: `${label}, sign in required`,
              exact: true,
            }),
          ).toBeEnabled();
        expect(
          await row.evaluate((element) => {
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
      await expect(section.getByRole("button")).toHaveCount(4);
      if (width === 820 && scale === 2) {
        const follow = section.locator("#follow");
        const explanation = await follow
          .getByRole("heading", { level: 3 })
          .locator("..")
          .boundingBox();
        const action = await follow
          .getByRole("button", {
            name: "Open watchlist, sign in required",
            exact: true,
          })
          .boundingBox();
        expect(action!.y).toBeGreaterThanOrEqual(
          explanation!.y + explanation!.height,
        );
      }
      await expect(
        section.getByRole("link", { name: "Read the guide", exact: true }),
      ).toHaveAttribute("href", "/Guide");
      for (const control of await section.locator("a, button").all()) {
        // Prepare the target for layout/focus-style inspection. Native Tab
        // order and scrolling are exercised separately in homeFluidLayout.
        await control.evaluate((element) =>
          element.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "instant",
          }),
        );
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await control.focus();
        await expect(control).toBeFocused();
        await expect(control).toBeInViewport({ ratio: 1 });
        expect(
          await control.evaluate((el) => getComputedStyle(el).outlineStyle),
        ).not.toBe("none");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

test("keeps every local anchor unique and the Learning footer useful", async ({
  page,
}) => {
  await page.goto("/");
  const anchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("href")!.slice(1)),
    );
  for (const id of anchors)
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  await page.getByRole("link", { name: "Learning", exact: true }).click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(
    page.locator("#experience").getByRole("heading", { level: 3 }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Visit Help Center", exact: false }),
  ).toHaveAttribute("href", "/Help");
});

for (const id of ["follow", "experience"]) {
  test(`preserves direct links to the ${id} task`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#${id}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.locator(`#${id}`).getByRole("heading", { level: 3 }),
    ).toBeInViewport();
  });
}

test("retains visible tools and restrained feedback with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const control = page.locator("#discover").getByRole("button", {
    name: "Explore top picks, sign in required",
    exact: true,
  });
  await expect(control).toBeEnabled();
  await control.hover();
  expect(
    await control.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  for (const row of tasks)
    await expect(page.locator(`#${row.id}`)).toBeVisible();
});

test.describe("task navigation without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("renders every task and preserves public links and native hash navigation", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page.locator("#research-tasks");
    for (const task of tasks) {
      await expect(
        section
          .locator(`#${task.id}`)
          .getByRole("heading", { name: task.title, exact: true }),
      ).toBeVisible();
      for (const label of task.actions)
        await expect(
          section.getByRole("button", {
            name: `${label}, sign in required`,
            exact: true,
          }),
        ).toBeDisabled();
    }
    await expect(
      section.getByRole("link", { name: "Read the guide", exact: true }),
    ).toHaveAttribute("href", "/Guide");
    await page.getByRole("link", { name: "Learning", exact: true }).click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(
      page.locator("#experience").getByRole("heading", { level: 3 }),
    ).toBeInViewport();
  });
});
