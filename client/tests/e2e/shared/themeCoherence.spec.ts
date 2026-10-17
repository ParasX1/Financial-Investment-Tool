import { expect, test, type Locator, type Page } from "@playwright/test";
import { fitColors } from "../../../styles/themeTokens";
import { installMarketNewsMockBackend } from "../market-news/marketNewsMockBackend";
import { installTopPicksMockBackend } from "../top-picks/topPicksMockBackend";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

// These are browser presentation fixtures. They do not exercise a live provider.
const discussionTitle = "Research discussion for theme verification";
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(", ")})`;
const luminance = (value: string) => {
  const channels = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  expect(channels).toHaveLength(3);
  const linear = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};
const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => a - b,
  );
  return (values[1] + 0.05) / (values[0] + 0.05);
};

async function installThemeFixtures(page: Page, signedIn = false) {
  await installTopPicksMockBackend(page);
  await installMarketNewsMockBackend(page);
  if (signedIn) {
    await installWatchlistMockBackend(page);
    await page.route("**/rest/v1/posts?**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "33333333-3333-4333-8333-333333333333",
            title: discussionTitle,
            body: "Synthetic research notes for browser presentation checks.",
            author_id: "31313131-3131-4131-8131-313131313131",
            tags: ["Earnings"],
            post_type: "discussion",
            post_tickers: ["CBA.AX"],
            image_url: null,
            image_path: null,
            votes: 4,
            created_at: "2026-10-09T00:00:00Z",
          },
        ]),
      }),
    );
    for (const table of ["comments", "post_likes", "post_saves"]) {
      await page.route(`**/rest/v1/${table}?**`, (route) =>
        route.fulfill({ contentType: "application/json", body: "[]" }),
      );
    }
  }
  await page.route("**/api/etfs?*", (route) => {
    const windowCode = new URL(route.request().url()).searchParams.get(
      "window",
    );
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        data: {
          rows: [
            {
              rank: 1,
              symbol: "THEME",
              name: "Theme fixture ETF",
              category: "Equity",
              issuer: "Example",
              expenseRatio: 0,
              aumUsd: 0,
              priceReturn: 0,
              volatility: null,
              sharpe: null,
              maxDrawdown: null,
            },
          ],
          total: 1,
        },
        metadata: {
          windowCode,
          generatedAt: "2026-10-09T01:02:03Z",
          source: "hardcoded_preview",
          sortKey: windowCode === "1Y" ? "sharpe" : "priceReturn",
        },
        warnings: [],
      }),
    });
  });
}

async function expectPageFits(page: Page, heading: Locator) {
  const viewport = page.viewportSize()!;
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(viewport.width);
  const bounds = await heading.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
}

async function expectKeyboardTableScroll(page: Page, name: string) {
  const container = page.getByRole("region", { name, exact: true });
  await expect(container).toHaveAttribute("tabindex", "0");
  await expect(container).toHaveCSS("background-color", rgb(fitColors.surface));
  const headerStyle = await container
    .locator("th")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });
  expect(headerStyle.background).toBe(rgb(fitColors.raised));
  expect(
    contrast(headerStyle.color, headerStyle.background),
  ).toBeGreaterThanOrEqual(4.5);
  const geometry = await container.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(geometry.overflowX).toBe("auto");
  if (page.viewportSize()!.width < 768) {
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    await container.focus();
    await container.press("ArrowRight");
    await expect
      .poll(() => container.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await expectPageFits(page, page.getByRole("heading", { level: 1 }));
  }
}

const pages = [
  { path: "/", heading: "Make sense of investing." },
  { path: "/Profile", heading: "Profile" },
  { path: "/Portfolio", heading: "Portfolio" },
  { path: "/TopPicks", heading: "Top Picks" },
  { path: "/ETF", heading: "ETF" },
  { path: "/MarketNews", heading: "Market News" },
  { path: "/Watchlist", heading: "Watchlist", signedIn: true },
  { path: "/Community", heading: "Community", signedIn: true },
  { path: "/CommunityCreate", heading: "Community", signedIn: true },
  { path: "/Guide", heading: "Guide" },
  { path: "/Help", heading: "Help Center" },
] as const;

test("page titles follow public navigation and browser history", async ({
  page,
}) => {
  await installThemeFixtures(page);
  await page.goto("/Help");
  await expect(page).toHaveTitle("Help Center | FIT");
  await page.getByRole("link", { name: "FIT home", exact: true }).click();
  await expect(page).toHaveTitle("FIT | Financial Investment Tool");
  await page
    .getByRole("navigation", { name: "Home", exact: true })
    .getByRole("link", { name: "Guide", exact: true })
    .click();
  await expect(page).toHaveURL(/\/Guide$/);
  await expect(page).toHaveTitle("Guide | FIT");
  await page.goBack();
  await expect(page).toHaveTitle("FIT | Financial Investment Tool");
  await page.goBack();
  await expect(page).toHaveTitle("Help Center | FIT");
  await page.goForward();
  await expect(page).toHaveTitle("FIT | Financial Investment Tool");
  await page.goForward();
  await expect(page).toHaveTitle("Guide | FIT");
});

test.describe("server-rendered page titles", () => {
  test.use({ javaScriptEnabled: false });
  test("public learning pages identify their purpose before hydration", async ({
    page,
  }) => {
    await page.goto("/Help");
    await expect(page).toHaveTitle("Help Center | FIT");
    await page.goto("/Guide");
    await expect(page).toHaveTitle("Guide | FIT");
  });
});

test("ETF retry retains readable primary ink after a preview failure", async ({
  page,
}) => {
  await installThemeFixtures(page);
  await page.route("**/api/etfs?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: "Preview temporarily unavailable" }),
    }),
  );
  await page.goto("/ETF");
  const retry = page.getByRole("button", { name: "Retry loading ETF preview" });
  await expect(retry).toBeVisible();
  const colors = await retry.evaluate((element) => {
    let background = "";
    for (
      let ancestor: Element | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const value = getComputedStyle(ancestor).backgroundColor;
      if (value !== "rgba(0, 0, 0, 0)") {
        background = value;
        break;
      }
    }
    return { foreground: getComputedStyle(element).color, background };
  });
  expect(contrast(colors.foreground, colors.background)).toBeGreaterThanOrEqual(
    4.5,
  );
});

test("Top Picks secondary actions retain their local surface and text roles", async ({
  page,
}) => {
  await installThemeFixtures(page);
  await page.goto("/TopPicks");
  const edit = page.getByRole("button", { name: "Edit Columns", exact: true });
  await expect(edit).toBeEnabled();
  await expect(edit).toHaveCSS("background-color", rgb(fitColors.field));
  await expect(edit).toHaveCSS("color", rgb(fitColors.body));
  await edit.hover();
  await expect(edit).toHaveCSS("background-color", rgb(fitColors.raised));
  await expect(edit).toHaveCSS("color", rgb(fitColors.body));
});

test("first Tab exposes a readable skip action and Enter reaches the main", async ({
  page,
}) => {
  await installThemeFixtures(page);
  await page.goto("/Guide");
  await expect(
    page.getByRole("heading", { name: "Guide", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /^Skip to guide/ });
  await expect(skip).toBeFocused();
  const style = await skip.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { color: computed.color, background: computed.backgroundColor };
  });
  expect(contrast(style.color, style.background)).toBeGreaterThanOrEqual(4.5);
  await skip.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("Portfolio narrow presets and end date remain fully reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await installThemeFixtures(page);
  await page.goto("/Portfolio");
  await expect(
    page.getByRole("heading", { name: "Portfolio", exact: true }),
  ).toBeVisible();
  const panel = page.getByRole("region", { name: "Portfolio command bar" });
  const panelBounds = await panel.boundingBox();
  expect(panelBounds).not.toBeNull();
  for (const control of [
    panel.getByRole("button", { name: "5Y", exact: true }),
    panel.getByLabel("To", { exact: true }),
  ]) {
    await expect(control).toBeVisible();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(panelBounds!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      panelBounds!.x + panelBounds!.width + 1,
    );
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    await control.focus();
    await expect(control).toBeFocused();
  }
  const preset = panel.getByRole("button", { name: "5Y", exact: true });
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  const end = panel.getByLabel("To", { exact: true });
  await end.fill("2026-01-15");
  await expect(end).toHaveValue("2026-01-15");
});

for (const width of [1440, 320]) {
  test.describe(`shared theme at ${width}px`, () => {
    for (const entry of pages) {
      test(`${entry.path} inherits the canvas and exposes usable content`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await installThemeFixtures(page, "signedIn" in entry && entry.signedIn);
        await page.goto(entry.path);
        const heading = page.getByRole("heading", {
          level: 1,
          name: entry.heading,
          exact: true,
        });
        await expect(heading).toBeVisible();
        await expect(page).toHaveTitle(
          entry.path === "/"
            ? "FIT | Financial Investment Tool"
            : `${entry.heading} | FIT`,
        );
        const main = page.getByRole("main");
        await expect(main).toHaveCount(1);
        await expect(main).toHaveAttribute("tabindex", "-1");
        await expect(
          page.locator('style[data-fit-theme="dark-purple"]'),
        ).toHaveCount(1);
        await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          rgb(fitColors.page),
        );
        await expect(main).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(heading).toHaveCSS("color", rgb(fitColors.text));
        const headingStyle = await heading.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.color,
            fontFamily: style.fontFamily,
            fontSize: parseFloat(style.fontSize),
            lineHeight: parseFloat(style.lineHeight),
          };
        });
        expect(headingStyle.fontSize).toBeGreaterThanOrEqual(24);
        expect(headingStyle.lineHeight).toBeGreaterThanOrEqual(
          headingStyle.fontSize,
        );
        expect(
          contrast(headingStyle.color, rgb(fitColors.page)),
        ).toBeGreaterThanOrEqual(4.5);
        if (entry.path !== "/") {
          const subtitle = main.locator("header").first().locator("p").last();
          await expect(subtitle).toBeVisible();
          const subtitleStyle = await subtitle.evaluate((element) => {
            const style = getComputedStyle(element);
            return { color: style.color, fontSize: parseFloat(style.fontSize) };
          });
          expect(subtitleStyle.fontSize).toBeGreaterThanOrEqual(14);
          expect(
            contrast(subtitleStyle.color, rgb(fitColors.page)),
          ).toBeGreaterThanOrEqual(4.5);
        }

        if (entry.path === "/TopPicks") {
          await expect(main.locator("tbody tr")).toHaveCount(25);
          await expect(
            page.getByRole("table", { name: "Top Picks rankings" }),
          ).toBeVisible();
          await expectKeyboardTableScroll(page, "Top Picks table scroll area");
        } else if (entry.path === "/ETF") {
          await expect(main.locator("tbody tr")).toHaveCount(1);
          await expect(main).toContainText("Theme fixture ETF");
          await expectKeyboardTableScroll(page, "ETF table scroll area");
        } else if (entry.path === "/MarketNews") {
          await expect(
            main.getByText("Top Stories story 1", { exact: true }).first(),
          ).toBeVisible();
          const search = page.getByRole("searchbox", {
            name: "Search market news",
          });
          await expect(search).toHaveCSS(
            "background-color",
            rgb(fitColors.field),
          );
          await search.fill("company results");
          await search.press("Enter");
          await expect(page).toHaveURL(/q=company(?:\+|%20)results/);
          await expect(search).toHaveValue("company results");
        } else if (entry.path === "/Watchlist") {
          await expect(
            page.getByRole("button", { name: "Edit CBA.AX research note" }),
          ).toBeVisible();
          const search = page.getByRole("combobox", {
            name: "Company or ticker",
          });
          await search.fill("Wesfarmers");
          await expect(
            page.getByRole("option", { name: /WES.AX/ }),
          ).toBeVisible();
          await search.press("Escape");
        } else if (entry.path === "/Community") {
          await expect(
            page.getByRole("heading", { name: discussionTitle }),
          ).toBeVisible();
          const search = page.getByRole("searchbox", {
            name: "Search discussions",
          });
          await search.fill("no matching research");
          await expect(
            page.getByText("No discussions match your search.", {
              exact: true,
            }),
          ).toBeVisible();
          await search.fill("");
          await expect(
            page.getByRole("heading", { name: discussionTitle }),
          ).toBeVisible();
        } else if (entry.path === "/CommunityCreate") {
          const title = page.getByLabel("Discussion title", { exact: true });
          await title.fill("Theme draft");
          const body = page.getByLabel("Discussion body", { exact: true });
          await body.fill("A **readable** preview");
          await page
            .getByRole("button", { name: "Preview", exact: true })
            .click();
          await expect(
            page.getByLabel("Markdown preview").locator("strong"),
          ).toHaveText("readable");
        } else if (entry.path === "/Portfolio") {
          const command = page.getByRole("region", {
            name: "Portfolio command bar",
          });
          for (const label of [
            "Shared universe",
            "Benchmark",
            "Risk-free %",
            "VaR confidence",
            "From",
            "To",
          ]) {
            await expect(command.getByLabel(label)).toBeVisible();
          }
          await page
            .getByRole("button", { name: "Focus", exact: true })
            .click();
          await expect(
            page.getByRole("region", { name: "Focus mode" }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Back to Board", exact: true })
            .click();
          await expect(
            page.getByRole("region", { name: "Multi-metric Portfolio board" }),
          ).toBeVisible();
        } else if (entry.path === "/Guide" || entry.path === "/Help") {
          const navigation = page.getByRole("navigation", {
            name: entry.path === "/Guide" ? "Guide Topics" : "Help Topics",
          });
          const topic = navigation.getByRole("button").nth(1);
          await topic.click();
          await expect(topic).toHaveAttribute("aria-pressed", "true");
          await expect(main.locator('section[tabindex="-1"]')).toBeFocused();
        } else if (entry.path === "/Profile") {
          await expect(
            page.getByRole("heading", { name: "Sign in to continue" }),
          ).toBeVisible();
        }

        const skip = page.getByRole("link", { name: /^Skip to/ });
        await skip.focus();
        await skip.press("Enter");
        await expect(main).toBeFocused();
        await expectPageFits(page, heading);
        await testInfo.attach("computed-theme", {
          body: JSON.stringify({ path: entry.path, width, headingStyle }),
          contentType: "application/json",
        });
        await page.screenshot({
          path: testInfo.outputPath("page-theme.png"),
          fullPage: true,
        });
      });
    }
  });
}

for (const width of [1440, 320]) {
  test(`body-mounted account dialogs inherit readable purple controls at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await installThemeFixtures(page);
    await page.goto("/Profile");
    const opener = page.getByRole("button", { name: "Sign in", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName("Welcome back");
    expect(
      await dialog.evaluate((element) => element.closest("main") === null),
    ).toBe(true);
    await expect(dialog.locator(".modal-content")).toHaveCSS(
      "background-color",
      rgb(fitColors.surface),
    );
    const email = dialog.getByLabel("Email address");
    await expect(email).toBeFocused();
    await expect(email).toHaveCSS("background-color", rgb(fitColors.field));
    await expect(email).toHaveCSS("border-color", rgb(fitColors.focus));
    expect(
      contrast(rgb(fitColors.focus), rgb(fitColors.field)),
    ).toBeGreaterThanOrEqual(3);
    const submit = dialog.locator('button[type="submit"]');
    await expect(submit).toHaveCSS("background-color", rgb(fitColors.action));
    await expect(submit).toHaveCSS("color", rgb(fitColors.onAction));
    expect(
      contrast(rgb(fitColors.onAction), rgb(fitColors.action)),
    ).toBeGreaterThanOrEqual(4.5);
    await dialog
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(dialog).toHaveAccessibleName("Create your FIT account");
    await expect(dialog.getByLabel("First name")).toBeFocused();
    for (const label of [
      "First name",
      "Last name",
      "Email address",
      "Password",
    ]) {
      const field = dialog.getByLabel(label, { exact: true });
      await expect(field).toBeVisible();
      await expect(field).toHaveCSS("background-color", rgb(fitColors.field));
      const foreground = await field.evaluate(
        (element) => getComputedStyle(element).color,
      );
      expect(contrast(foreground, rgb(fitColors.field))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
    await expectPageFits(
      page,
      dialog.getByRole("heading", {
        name: "Create your FIT account",
        exact: true,
      }),
    );
    await page.screenshot({ path: testInfo.outputPath("account-theme.png") });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
}
