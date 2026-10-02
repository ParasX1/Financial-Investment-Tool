import { expect, test, type Page } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const STORAGE_KEY = `fit.portfolioWorkspace.v3.${USER_ID}`;
const preferenceStatus = (page: Page) =>
  page
    .getByRole("status")
    .filter({ hasText: /saved symbols|could not be synced/i });

const installPreferences = async (page: Page) => {
  await installWatchlistMockBackend(page);
  await page.clock.install();
  let loadFailed = true;
  let saveFailed = false;
  let loads = 0;
  const saves: Array<{ tags: string[]; user_id: string }> = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/rest/v1/portfolio_prefs?*", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        },
      });
      return;
    }
    const headers = {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
    };
    if (request.method() === "GET") {
      loads += 1;
      await route.fulfill({
        // 500 ends this request; 503 is retried internally by PostgREST.
        status: loadFailed ? 500 : 200,
        headers,
        body: JSON.stringify(
          loadFailed ? { message: "Fixture offline" } : { tags: ["AAPL"] },
        ),
      });
    } else {
      saves.push(request.postDataJSON());
      await route.fulfill({
        status: saveFailed ? 503 : 201,
        headers,
        body: JSON.stringify(
          saveFailed ? { message: "Fixture offline" } : null,
        ),
      });
    }
  });
  await page.route("http://127.0.0.1:8080/api/metrics/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  return {
    recoverLoad: () => {
      loadFailed = false;
    },
    failSaving: () => {
      saveFailed = true;
    },
    recoverSaving: () => {
      saveFailed = false;
    },
    loads: () => loads,
    saves: () => saves.map((save) => ({ ...save, tags: [...save.tags] })),
    pageErrors,
  };
};

test("failed first loading never persists a fallback; retry preserves session edits", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const backend = await installPreferences(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/Portfolio");
  await expect(preferenceStatus(page)).toContainText("could not be loaded");
  await page.clock.fastForward(1_000);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBeNull();
  expect(backend.saves()).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("preferences-offline.png"),
    fullPage: true,
  });

  await page.reload();
  await expect(preferenceStatus(page)).toContainText("could not be loaded");
  await expect.poll(backend.loads).toBe(2);
  await page
    .locator("section[data-card-id]")
    .first()
    .getByRole("combobox", { name: "Metric" })
    .selectOption("BetaAnalysis");
  await page
    .getByRole("region", { name: "Portfolio command bar" })
    .getByLabel("Benchmark", { exact: true })
    .fill("QQQ");
  await page.getByRole("button", { name: "Run analysis" }).click();
  const symbolInput = page.locator("input#portfolio-stock-select");
  await symbolInput.fill("NVDA");
  await symbolInput.press("Enter");

  backend.recoverLoad();
  await page.getByRole("button", { name: "Retry saving preferences" }).click();
  await expect(preferenceStatus(page)).toHaveCount(0);
  await page.clock.fastForward(1_000);
  await expect.poll(() => backend.saves().at(-1)?.tags).toEqual(["AAPL"]);
  const savedWorkspace = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(savedWorkspace).toMatchObject({
    symbols: ["AAPL"],
    globalInputs: { benchmark: "QQQ" },
  });
  expect(savedWorkspace.cards[0].metricType).toBe("BetaAnalysis");
  await expect(page.getByText("NVDA", { exact: true }).first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("preferences-recovered.png"),
    fullPage: true,
  });
  expect(backend.pageErrors).toEqual([]);
});

test("applied offline symbols take precedence over the recovered cloud list", async ({
  page,
}) => {
  const backend = await installPreferences(page);
  await page.goto("/Portfolio");
  await expect(preferenceStatus(page)).toContainText("could not be loaded");
  const input = page.locator("input#portfolio-stock-select");
  await input.fill("NVDA");
  await input.press("Enter");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await page.clock.fastForward(1_000);
  expect(backend.saves()).toEqual([]);
  backend.recoverLoad();
  await page.getByRole("button", { name: "Retry saving preferences" }).click();
  await expect(preferenceStatus(page)).toHaveCount(0);
  await page.clock.fastForward(1_000);
  await expect.poll(() => backend.saves().at(-1)?.tags).toEqual(["NVDA"]);
  expect(
    backend
      .saves()
      .every((save) => save.user_id === USER_ID && save.tags.length > 0),
  ).toBe(true);
  expect(backend.pageErrors).toEqual([]);
});

test("failed remote saving has a retry that keeps current preferences", async ({
  page,
}) => {
  const backend = await installPreferences(page);
  backend.recoverLoad();
  backend.failSaving();
  await page.goto("/Portfolio");
  await expect(page.getByText("AAPL", { exact: true }).first()).toBeVisible();
  await page.clock.fastForward(1_000);
  await expect(preferenceStatus(page)).toContainText("could not be synced");
  backend.recoverSaving();
  await page.getByRole("button", { name: "Retry saving preferences" }).click();
  await page.clock.fastForward(1_000);
  await expect(preferenceStatus(page)).toHaveCount(0);
  expect(backend.loads()).toBe(1);
  expect(backend.saves().map((save) => save.tags)).toEqual([
    ["AAPL"],
    ["AAPL"],
  ]);
  expect(backend.pageErrors).toEqual([]);
});
