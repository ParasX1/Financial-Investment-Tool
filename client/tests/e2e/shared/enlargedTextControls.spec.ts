import { expect, test, type Locator, type Page } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_URL = "https://watchlist-e2e.supabase.co";
const avatar = "https://avatar.example.test/profile.svg";

test.use({ serviceWorkers: "block" });

// Read-only account fixtures and synthetic market data; unknown requests abort.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin === new URL(baseURL!).origin &&
      !url.pathname.startsWith("/api/") &&
      request.method() === "GET"
    ) {
      return route.continue();
    }
    return route.abort();
  });
  await installWatchlistMockBackend(page);
  await page.route(`${avatar}?*`, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#65a0fd"/></svg>',
    }),
  );
  await page.route(`${PROJECT_URL}/auth/v1/user`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          json: { id: USER_ID },
          headers: { "access-control-allow-origin": "*" },
        })
      : route.abort(),
  );
  await page.route(`${PROJECT_URL}/rest/v1/Users?*`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          json: {
            first_name: "Amelia",
            last_name: "Researcher",
            handle: "amelia_researcher",
            phone: "",
            avatar_path: null,
            avatar_url: avatar,
          },
          headers: { "access-control-allow-origin": "*" },
        })
      : route.abort(),
  );
});

async function setNavigation(page: Page, expanded: boolean) {
  const toggle = page.getByRole("button", {
    name: expanded ? "Expand navigation" : "Collapse navigation",
    exact: true,
  });
  if (await toggle.count()) await toggle.click();
  else
    await page.mouse.move(expanded ? 20 : page.viewportSize()!.width - 20, 300);
  await expect
    .poll(() =>
      page
        .locator("main")
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingInlineStart),
        ),
    )
    .toBe(expanded ? 232 : 64);
}

async function assertControlReachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: 1 });
  expect(
    await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return element === hit || element.contains(hit);
    }),
  ).toBe(true);
}

for (const width of [320, 390, 1920, 3440]) {
  for (const enlargedText of [false, true]) {
    test(`profile identity fits its card at ${width}px ${enlargedText ? "200%" : "normal"} text`, async ({
      page,
    }, testInfo) => {
      const writes: string[] = [];
      page.on("request", (request) => {
        if (!["GET", "OPTIONS"].includes(request.method()))
          writes.push(request.url());
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/Profile");
      const card = page.getByRole("complementary", { name: "Profile preview" });
      await expect(
        card.getByRole("heading", { name: "Amelia Researcher" }),
      ).toBeVisible();
      await expect(card).toContainText("@amelia_researcher");
      const image = card.getByRole("img");
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBe(64);
      await page.evaluate(() => document.fonts.ready);
      if (enlargedText)
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });

      for (const expanded of width >= 768 ? [false, true] : [false]) {
        if (width >= 768) await setNavigation(page, expanded);
        await card.scrollIntoViewIfNeeded();
        const geometry = await card.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const children = [...element.children].filter(
            (child) => child.getAttribute("aria-hidden") !== "true",
          );
          return {
            card: bounds.toJSON(),
            client: element.clientWidth,
            scroll: element.scrollWidth,
            children: children.map((child) =>
              child.getBoundingClientRect().toJSON(),
            ),
            text: [...element.querySelectorAll("h2,p")].flatMap((child) => {
              const range = document.createRange();
              range.selectNodeContents(child);
              return [...range.getClientRects()].map((rect) => rect.toJSON());
            }),
          };
        });
        await testInfo.attach(`profile-bounds-${expanded}`, {
          body: JSON.stringify(geometry),
          contentType: "application/json",
        });
        for (const rect of [...geometry.children, ...geometry.text]) {
          expect(rect.left).toBeGreaterThanOrEqual(geometry.card.left);
          expect(rect.right).toBeLessThanOrEqual(geometry.card.right);
        }
        const edit = card.getByRole("button", {
          name: "Edit profile",
          exact: true,
        });
        await assertControlReachable(edit);
        await edit.focus();
        await expect(edit).toBeFocused();
      }
      expect(writes).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("profile.png"),
        fullPage: true,
      });
    });

    test(`watchlist controls remain reachable at ${width}px ${enlargedText ? "200%" : "normal"} text`, async ({
      page,
    }, testInfo) => {
      const writes: string[] = [];
      page.on("request", (request) => {
        if (!["GET", "OPTIONS"].includes(request.method()))
          writes.push(request.url());
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/Watchlist");
      const remove = page.getByRole("button", {
        name: "Remove CBA.AX from watchlist",
        exact: true,
      });
      await expect(remove).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      if (enlargedText)
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
      const row = remove.locator("xpath=ancestor::article");
      const section = row.locator("xpath=ancestor::section");
      await expect(row.getByText("ASX", { exact: true })).toBeVisible();
      for (const expanded of width >= 768 ? [false, true] : [false]) {
        if (width >= 768) await setNavigation(page, expanded);
        await row.scrollIntoViewIfNeeded();
        const bounds = await section.boundingBox();
        for (const identity of await row
          .locator('h3, [class*="exchange"]')
          .all()) {
          const rect = await identity.boundingBox();
          expect(rect!.x).toBeGreaterThanOrEqual(bounds!.x);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(
            bounds!.x + bounds!.width,
          );
        }
        const controls = row.getByRole("button").or(row.getByRole("link"));
        for (const control of await controls.all()) {
          const rect = await control.boundingBox();
          expect(rect!.x).toBeGreaterThanOrEqual(bounds!.x);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(
            bounds!.x + bounds!.width,
          );
          if (await control.isEnabled()) await assertControlReachable(control);
        }
        await testInfo.attach(`watchlist-bounds-${expanded}`, {
          body: JSON.stringify(
            await row.evaluate((element) => ({
              rect: element.getBoundingClientRect().toJSON(),
              columns: getComputedStyle(element).gridTemplateColumns,
              client: element.clientWidth,
              scroll: element.scrollWidth,
            })),
          ),
          contentType: "application/json",
        });
        await page
          .getByRole("button", { name: "Move CBA.AX down", exact: true })
          .focus();
        await page.keyboard.press("Tab");
        await expect(remove).toBeFocused();
        await assertControlReachable(remove);
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByRole("heading", { name: "Remove CBA.AX?", exact: true }),
        ).toBeVisible();
        const cancel = dialog.getByRole("button", {
          name: "Keep Item",
          exact: true,
        });
        await assertControlReachable(cancel);
        await cancel.click();
        await expect(dialog).toBeHidden();
        await expect(remove).toBeFocused();
        await remove.click();
        await expect(dialog).toBeVisible();
        await dialog
          .getByRole("button", { name: "Keep Item", exact: true })
          .click();
        await expect(dialog).toBeHidden();
        if (width === 3440 && !enlargedText) {
          expect(
            await row.evaluate(
              (element) =>
                getComputedStyle(element).gridTemplateColumns.split(" ").length,
            ),
          ).toBe(4);
          await expect(
            section.getByText("Actions", { exact: true }),
          ).toBeVisible();
        }
      }
      expect(writes).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("watchlist.png"),
        fullPage: true,
      });
    });
  }
}
