import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { installTopPicksMockBackend } from "./topPicksMockBackend";

const gate = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

test("exports only the resolved page and hides prior rankings when a changed query fails", async ({
  page,
}) => {
  await installTopPicksMockBackend(page);
  const pageResponse = gate();
  const sortResponse = gate();
  let pageRequested = false;
  let sortRequested = false;
  let failChangedSort = true;

  await page.route("**/api/top-picks", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON();
    if (request.page === 2 && !pageRequested) {
      pageRequested = true;
      await pageResponse.promise;
    }
    if (request.sort_key === "ret1y" && failChangedSort) {
      sortRequested = true;
      await sortResponse.promise;
      failChangedSort = false;
      await route.fulfill({
        status: 503,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          error: "New ranking is temporarily unavailable.",
        }),
      });
      return;
    }
    await route.fallback();
  });

  try {
    await page.goto("/TopPicks");
    const exportButton = page.getByRole("button", { name: "Export page CSV" });
    await expect(page.locator("tbody tr")).toHaveCount(25);
    await expect(exportButton).toBeEnabled();

    await page.getByRole("button", { name: "Go to page 2" }).click();
    await expect.poll(() => pageRequested).toBe(true);
    await expect(exportButton).toBeDisabled();
    await expect(page.locator("tbody")).not.toContainText("CBA.AX");
    await expect(
      page.getByText("Waiting for sync", { exact: true }),
    ).toBeVisible();

    pageResponse.release();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(
      page.locator("tbody tr").first().getByRole("cell").first(),
    ).toHaveText("26");
    await expect(exportButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath!, "utf8");
    expect(csv.trimEnd().split(/\r?\n/)).toHaveLength(3);
    expect(csv).toContain('"26",');
    expect(csv).not.toContain('"CBA.AX"');

    const priorPageText = await page
      .locator("tbody tr")
      .first()
      .getByRole("cell")
      .nth(1)
      .innerText();
    await page.getByRole("button", { name: /^Price return:/ }).click();
    await expect.poll(() => sortRequested).toBe(true);
    await expect(exportButton).toBeDisabled();
    await expect(page.locator("tbody")).not.toContainText(priorPageText);
    sortResponse.release();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "New ranking is temporarily unavailable." }),
    ).toContainText("New ranking is temporarily unavailable.");
    await expect(exportButton).toBeDisabled();
    await expect(page.locator("tbody")).not.toContainText(priorPageText);

    await page.getByRole("button", { name: "Retry loading Top Picks" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(25);
    await expect(page.locator("tbody tr").first()).toContainText("WES.AX");
    await expect(exportButton).toBeEnabled();
  } finally {
    pageResponse.release();
    sortResponse.release();
  }
});

test("keeps the selected window free of the preceding window's rows and generation time", async ({
  page,
}) => {
  await installTopPicksMockBackend(page);
  const dayResponse = gate();
  let dayRequested = false;

  await page.route("**/api/top-picks", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON();
    if (request.window !== "1D") {
      await route.fallback();
      return;
    }
    dayRequested = true;
    await dayResponse.promise;
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          rows: [{ symbol: "DAY.AX", name: "Day Company", ret1y: 0.01 }],
          total: 1,
        },
        metadata: { window: "trailing_day", windowCode: "1D" },
        warnings: [],
      }),
    });
  });

  try {
    await page.goto("/TopPicks");
    const exportButton = page.getByRole("button", { name: "Export page CSV" });
    await expect(page.locator("tbody tr")).toHaveCount(25);
    await expect(page.getByText(/^Updated /)).toBeVisible();

    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect.poll(() => dayRequested).toBe(true);
    await expect(exportButton).toBeDisabled();
    await expect(page.locator("tbody")).not.toContainText("CBA.AX");
    await expect(
      page.getByText("Waiting for sync", { exact: true }),
    ).toBeVisible();

    dayResponse.release();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("DAY.AX");
    await expect(page.getByRole("columnheader").last()).toContainText(
      "Price return",
    );
    await expect(
      page.getByText("Waiting for sync", { exact: true }),
    ).toBeVisible();
    await expect(exportButton).toBeEnabled();
  } finally {
    dayResponse.release();
  }
});
