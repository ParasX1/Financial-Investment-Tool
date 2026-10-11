import { expect, test } from "@playwright/test";

test("offers both account modes from the home page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { exact: true, name: "Sign in" })
    .first()
    .click();

  const dialog = page.getByRole("dialog");
  const modePicker = dialog.getByRole("group", { name: "Account access" });
  await expect(dialog).toHaveAccessibleName("Welcome back");
  await expect(
    modePicker.getByRole("button", { exact: true, name: "Sign in" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    modePicker.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Email address")).toBeFocused();

  await modePicker.getByRole("button", { name: "Create account" }).click();
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "new-password",
  );

  await dialog
    .getByRole("button", { name: "Close authentication dialog" })
    .click();
  await expect(dialog).toBeHidden();
});

test("keeps create account available from an app-internal sign-in", async ({
  page,
}) => {
  await page.goto("/Watchlist");
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Welcome back");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
});

test("fits the account dialog on a narrow student-sized screen", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/Watchlist");
  await page
    .getByRole("button", { exact: true, name: "Create account" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const content = dialog.locator(".modal-content");
  const bounds = await content.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect(dialog).toBeInViewport();
  await expect(
    dialog.getByRole("button", { name: "Continue with Google" }),
  ).toBeInViewport();
});

test("keeps passwords inspectable, validates fields and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/Watchlist");
  const opener = page.getByRole("button", { exact: true, name: "Sign in" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const modePicker = dialog.getByRole("group", { name: "Account access" });
  const password = dialog.getByLabel("Password", { exact: true });

  await password.fill("local UI example password");
  await dialog.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("local UI example password");
  await modePicker.getByRole("button", { name: "Create account" }).click();
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByLabel("First name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(dialog.getByLabel("First name")).toHaveAccessibleDescription(
    "Enter your first name.",
  );

  await modePicker
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(dialog.getByLabel("Email address")).toBeFocused();
  await dialog.getByRole("button", { name: "Continue with Google" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close authentication dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Continue with Google" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("keeps every signup control reachable when errors fill a small viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await page.goto("/Watchlist");
  await page
    .getByRole("button", { exact: true, name: "Create account" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByLabel("Email address")).toHaveAccessibleDescription(
    "Enter your email address.",
  );
  const google = dialog.getByRole("button", { name: "Continue with Google" });
  await google.scrollIntoViewIfNeeded();
  await expect(google).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Close authentication dialog" })
    .click();
  await expect(dialog).toBeHidden();
});

test("blocks editing and dismissal during sign-in, then recovers from a mocked failure", async ({
  page,
}) => {
  let releaseResponse!: () => void;
  let sawRequest!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    sawRequest = resolve;
  });
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    sawRequest();
    await responseGate;
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error_code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    });
  });
  await page.goto("/Watchlist");
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email address").fill("ui-fixture@example.invalid");
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("local UI example password");
  await dialog.locator('button[type="submit"]').click();
  await requestStarted;

  await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByLabel("Email address")).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Show password" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Close authentication dialog" }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();

  releaseResponse();
  await expect(dialog.getByRole("alert")).toContainText("email and password");
  await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "false");
  await expect(dialog.getByLabel("Email address")).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Close authentication dialog" }),
  ).toBeEnabled();
});
