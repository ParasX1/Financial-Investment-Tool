import { expect, test } from "@playwright/test";

test("offers both account modes from the home page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Sign in" }).first().click();

  const dialog = page.getByRole("dialog");
  const modePicker = dialog.getByRole("group", { name: "Account access" });
  await expect(dialog).toHaveAccessibleName("Welcome back");
  await expect(modePicker.getByRole("button", { exact: true, name: "Sign in" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(modePicker.getByRole("button", { name: "Create account" }))
    .toBeVisible();
  await expect(dialog.getByLabel("Email address")).toBeFocused();

  await modePicker.getByRole("button", { name: "Create account" }).click();
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await expect(dialog.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );

  await dialog.getByRole("button", { name: "Close authentication dialog" }).click();
  await expect(dialog).toBeHidden();
});

test("keeps create account available from an app-internal sign-in", async ({ page }) => {
  await page.goto("/Watchlist");
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Welcome back");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
});

test("fits the account dialog on a narrow student-sized screen", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/Watchlist");
  await page.getByRole("button", { exact: true, name: "Create account" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await expect.poll(() => page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  )).toBe("rgb(0, 0, 0)");
  await expect(dialog).toBeInViewport();
});
