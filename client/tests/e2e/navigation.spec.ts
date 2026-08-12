import { expect, test } from "@playwright/test";

test.describe("Application navigation", () => {
  test("closes the mobile drawer when browser history changes the route", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/Guide");

    await expect(
      page.getByRole("heading", { level: 1, name: "Guide" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.getByRole("link", { name: "Help", exact: true }).click();
    await expect(page).toHaveURL(/\/Help$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Help Center" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.goBack();

    await expect(page).toHaveURL(/\/Guide$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Guide" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe("hidden");
  });
});
