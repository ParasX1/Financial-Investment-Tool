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
}, testInfo) => {
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
    dialog.getByRole("button", { name: "Sign in with Google" }),
  ).toBeInViewport();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-up-mobile.png"),
  });
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
  await dialog.getByRole("button", { name: "Sign in with Google" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close authentication dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Sign in with Google" }),
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
  const google = dialog.getByRole("button", { name: "Sign in with Google" });
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
}, testInfo) => {
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
    dialog.getByRole("button", { name: "Sign in with Google" }),
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
  await expect(dialog.getByRole("status")).toHaveText(
    "Signing in. Please wait.",
  );
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-in-pending.png"),
  });

  releaseResponse();
  await expect(dialog.getByRole("alert")).toContainText("email and password");
  await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "false");
  await expect(dialog.getByLabel("Email address")).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Close authentication dialog" }),
  ).toBeEnabled();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-in-error.png"),
  });
});

test("presents one centered desktop sheet with readable controls and approved Google artwork", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/Watchlist");
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  const dialog = page.getByRole("dialog");
  const content = dialog.locator(".modal-content");
  await expect
    .poll(() =>
      content.evaluate(
        (element) =>
          element
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  const bounds = await content.boundingBox();
  const centeredX = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    // Modal keeps the page's scrollbar gutter stable while locking body scroll.
    return (
      (bounds.left +
        parseFloat(style.paddingLeft) +
        bounds.right -
        parseFloat(style.paddingRight)) /
      2
    );
  });
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeCloseTo(472, 0);
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(centeredX, 0);
  expect(bounds!.y + bounds!.height / 2).toBeCloseTo(450, 0);

  const email = dialog.getByLabel("Email address");
  await expect(email).toHaveCSS("font-size", "16px");
  const inputBounds = await email.boundingBox();
  expect(inputBounds!.height).toBeGreaterThanOrEqual(48);
  expect(inputBounds!.height).toBeLessThanOrEqual(52);
  const submit = dialog.locator('button[type="submit"]');
  await expect(submit).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(submit).toHaveCSS("background-color", "rgb(91, 80, 230)");

  const google = dialog.getByRole("button", { name: "Sign in with Google" });
  const artwork = google.locator("img");
  await expect(artwork).toHaveAttribute("src", "/brand/google-signin-dark.svg");
  await expect(artwork).toHaveAttribute("alt", "");
  await expect(google).toHaveCSS("border-width", "0px");
  const artworkBounds = await artwork.boundingBox();
  expect(artworkBounds!.width).toBeCloseTo(216, 0);
  expect(artworkBounds!.height).toBeCloseTo(48, 0);
  expect(artworkBounds!.x + artworkBounds!.width / 2).toBeCloseTo(centeredX, 0);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-in-desktop.png"),
  });

  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await expect(google).toBeInViewport();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-up-desktop.png"),
  });
});

test("opens a complete reduced-motion form on a short mobile screen", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ height: 568, width: 320 });
  await page.goto("/Watchlist");
  await page
    .getByRole("button", { exact: true, name: "Create account" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".modal-content")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(dialog.getByLabel("First name")).toBeFocused();
  for (const label of [
    "First name",
    "Last name",
    "Email address",
    "Password",
  ]) {
    const input = dialog.getByLabel(label, { exact: true });
    await input.scrollIntoViewIfNeeded();
    await expect(input).toBeInViewport({ ratio: 1 });
    await expect(input).toHaveCSS("font-size", "16px");
    await expect(input).toHaveCSS("transition-duration", "0s");
  }
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Check the highlighted fields to continue.",
  );
  const google = dialog.getByRole("button", { name: "Sign in with Google" });
  await google.scrollIntoViewIfNeeded();
  await expect(google).toBeInViewport({ ratio: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-up-mobile-errors-reduced-motion.png"),
  });
});

test("dismisses the idle sheet from the backdrop and restores the opener", async ({
  page,
}) => {
  await page.goto("/Watchlist");
  const opener = page.getByRole("button", { exact: true, name: "Sign in" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Email address")).toBeFocused();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("keeps signup confirmation visible and clears the password after a mocked email response", async ({
  page,
}, testInfo) => {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "ui-fixture@example.invalid",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: { first_name: "Example", last_name: "Student" },
          created_at: "2026-10-12T00:00:00.000Z",
        },
      }),
    });
  });
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/Watchlist");
  await page
    .getByRole("button", { exact: true, name: "Create account" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name").fill("Example");
  await dialog.getByLabel("Last name").fill("Student");
  await dialog.getByLabel("Email address").fill("ui-fixture@example.invalid");
  const password = dialog.getByLabel("Password", { exact: true });
  await password.fill("local UI example password");
  await dialog.getByRole("button", { name: "Show password" }).click();
  await dialog.locator('button[type="submit"]').click();

  await expect(
    dialog.getByRole("heading", { name: "Confirm your email" }),
  ).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText(
    "Check your inbox for a confirmation link, then return to continue.",
  );
  await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "false");
  await expect(password).toHaveValue("");
  await expect(password).toHaveAttribute("type", "password");
  await expect(dialog.getByLabel("Email address")).toBeEnabled();
  await expect(page).toHaveURL(/\/Watchlist$/);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("sign-up-confirmation.png"),
  });
});
