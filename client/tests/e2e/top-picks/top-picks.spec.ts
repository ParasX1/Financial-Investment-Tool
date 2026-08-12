import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  installTopPicksMockBackend,
  type TopPicksRequest,
} from "./topPicksMockBackend";

const expectRequest = async (
  requests: () => readonly TopPicksRequest[],
  expected: TopPicksRequest,
) => {
  await expect.poll(requests).toContainEqual(expected);
};

const columnIndex = async (
  page: import("@playwright/test").Page,
  name: string,
) => {
  const labels = await page.getByRole("columnheader").allTextContents();
  const index = labels.findIndex((label) => label.trim() === name);
  expect(index, `Expected a ${name} column`).toBeGreaterThanOrEqual(0);
  return index;
};

test("uses server ranking for sorting and pagination while preserving metric semantics", async ({
  page,
}) => {
  const backend = await installTopPicksMockBackend(page);
  const dataRows = page.locator("tbody tr");

  await page.goto("/TopPicks");

  await expect(
    page.getByRole("heading", { level: 1, name: "Top Picks" }),
  ).toBeVisible();
  await expectRequest(backend.requests, {
    page: 1,
    page_size: 25,
    sort_key: "sharpe",
    sort_dir: "desc",
  });
  await expect(page.getByText(/27 results.*Showing page 1 of 2/)).toBeVisible();
  await expect(dataRows).toHaveCount(25);
  await expect(dataRows.nth(0)).toContainText("CBA.AX");
  await expect(dataRows.nth(1)).toContainText("BHP.AX");
  await expect(dataRows.nth(2)).toContainText("WES.AX");

  const cbaRow = dataRows.filter({ hasText: "CBA.AX" });
  await expect(
    cbaRow.getByRole("cell").nth(await columnIndex(page, "Sortino")),
  ).toHaveText("Unbounded");
  await expect(
    cbaRow.getByRole("cell").nth(await columnIndex(page, "Alpha")),
  ).toHaveText("—");
  const bhpRow = dataRows.filter({ hasText: "BHP.AX" });
  await expect(
    bhpRow.getByRole("cell").nth(await columnIndex(page, "1Y Return")),
  ).toHaveText("—");

  await page.getByRole("button", { name: /^1Y Return:/ }).click();
  await expectRequest(backend.requests, {
    page: 1,
    page_size: 25,
    sort_key: "ret1y",
    sort_dir: "desc",
  });
  await expect(dataRows.nth(0)).toContainText("WES.AX");
  await expect(dataRows.nth(1)).toContainText("CBA.AX");

  await page.getByRole("button", { name: "Go to page 2" }).click();
  await expectRequest(backend.requests, {
    page: 2,
    page_size: 25,
    sort_key: "ret1y",
    sort_dir: "desc",
  });
  await expect(page.getByText(/27 results.*Showing page 2 of 2/)).toBeVisible();
  await expect(dataRows).toHaveCount(2);
  await expect(dataRows.nth(0).getByRole("cell").first()).toHaveText("26");

  await page.getByRole("combobox").click();
  await page.getByRole("option", { exact: true, name: "10" }).click();
  await expectRequest(backend.requests, {
    page: 1,
    page_size: 10,
    sort_key: "ret1y",
    sort_dir: "desc",
  });
  await expect(page.getByText(/27 results.*Showing page 1 of 3/)).toBeVisible();
  await expect(dataRows).toHaveCount(10);
  await expect(dataRows.nth(0).getByRole("cell").first()).toHaveText("1");
  await expect(dataRows.nth(0)).toContainText("WES.AX");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export page CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("top-picks.csv");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv.trimEnd().split(/\r?\n/)).toHaveLength(11);
  expect(csv).toContain('"Rank","Symbol","Company","1Y Return"');
  expect(csv.indexOf('"WES.AX"')).toBeLessThan(csv.indexOf('"CBA.AX"'));
  expect(csv).toContain('"Unbounded"');
  expect(csv).toContain('"—"');
  expect(backend.supabaseRequests()).toEqual([]);
});

test("never allows column visibility to reach zero", async ({ page }) => {
  await installTopPicksMockBackend(page);
  await page.goto("/TopPicks");
  await expect(page.locator("tbody tr")).toHaveCount(25);

  await page.getByRole("button", { name: "Edit Columns" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Edit columns", { exact: true })).toBeVisible();

  const columnsToHide = [
    "Rank",
    "Company",
    "1Y Return",
    "Sharpe",
    "Sortino",
    "Volatility",
    "Max DD",
    "Beta",
    "Alpha",
    "Info Ratio",
  ];
  for (const label of columnsToHide) {
    await dialog.getByRole("checkbox", { exact: true, name: label }).uncheck();
  }

  const finalColumn = dialog.getByRole("checkbox", {
    exact: true,
    name: "Symbol",
  });
  await expect(finalColumn).toBeChecked();
  await expect(finalColumn).toBeDisabled();
  await expect(dialog.getByRole("checkbox", { checked: true })).toHaveCount(1);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("columnheader")).toHaveCount(1);
  await expect(page.getByRole("columnheader")).toHaveText("Symbol");
  await expect(page.locator("tbody tr").first().getByRole("cell")).toHaveText(
    "CBA.AX",
  );
});
