import { expect, test, type Page, type Route } from "@playwright/test";

const projectUrl = "https://watchlist-e2e.supabase.co";
const storageKey = "sb-watchlist-e2e-auth-token";

function session(id = "account-a") {
  return {
    access_token: `fixture-token-${id}`,
    refresh_token: `fixture-refresh-${id}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id,
      email: `${id}@example.test`,
      email_confirmed_at: "2026-10-09T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-10-09T00:00:00Z",
    },
  };
}

async function reply(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function seed(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session() },
  );
}

test("recovers a failed profile load in place and restores pending email on re-entry", async ({
  page,
}) => {
  await seed(page);
  let profileReads = 0;
  await page.route(`${projectUrl}/auth/v1/user**`, (route) =>
    reply(route, {
      ...session().user,
      new_email: "pending@example.test",
      email_change_sent_at: "2026-10-09T00:00:00Z",
    }),
  );
  await page.route(`${projectUrl}/rest/v1/Users**`, async (route) => {
    if (route.request().method() === "PATCH")
      return reply(route, [{ id: "account-a" }]);
    profileReads += 1;
    if (profileReads === 1)
      return reply(route, { message: "private fixture service details" }, 500);
    return reply(route, {
      first_name: "Alice",
      last_name: "Ng",
      handle: "alice_01",
      phone: "",
    });
  });
  await page.goto("/Profile");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Profile details could not be loaded",
  );
  await page.getByRole("button", { name: "Retry profile" }).click();
  await expect(page.getByRole("heading", { name: "Alice Ng" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await dialog.getByLabel("First name", { exact: true }).fill("Alice Retry");
  await dialog.getByRole("button", { name: "Save identity" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Alice Retry Ng" }),
  ).toBeVisible();
  await page.goto("/Guide");
  await page.goto("/Profile");
  await expect(
    page.getByText("pending@example.test", { exact: true }).first(),
  ).toBeVisible();
  expect(profileReads).toBe(3);
});

test("reports sign-out failure, restores the action, and completes retry", async ({
  page,
}) => {
  await seed(page);
  await page.route(`${projectUrl}/auth/v1/user**`, (route) =>
    reply(route, session().user),
  );
  await page.route(`${projectUrl}/rest/v1/Users**`, (route) =>
    reply(route, { first_name: "Alice", last_name: "Ng", handle: "alice_01" }),
  );
  let firstLogout!: Route;
  let logoutCount = 0;
  await page.route(`${projectUrl}/auth/v1/logout**`, async (route) => {
    logoutCount += 1;
    if (logoutCount === 1) {
      firstLogout = route;
      return;
    }
    await route.fulfill({ status: 204 });
  });
  await page.goto("/Profile");
  const logout = page.getByRole("button", { name: "Log out", exact: true });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(logout).toBeDisabled();
  await expect.poll(() => Boolean(firstLogout)).toBe(true);
  await reply(
    firstLogout,
    { error_code: "unexpected_failure", msg: "private fixture details" },
    500,
  );
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("alert"),
  ).toContainText("Log out failed. Please try again.");
  await expect(logout).toBeEnabled();
  await logout.click();
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("alert"),
  ).toHaveCount(0);
  expect(logoutCount).toBe(2);
});

test("a late account A password response preserves the new account B and clears its dialog", async ({
  page,
}) => {
  await seed(page);
  let heldUpdate!: Route;
  await page.route(`${projectUrl}/auth/v1/user**`, async (route) => {
    if (route.request().method() === "PUT") {
      heldUpdate = route;
      return;
    }
    const owner = route.request().headers().authorization?.endsWith("account-b")
      ? "account-b"
      : "account-a";
    await reply(route, session(owner).user);
  });
  await page.route(`${projectUrl}/rest/v1/Users**`, (route) => {
    const owner = new URL(route.request().url()).searchParams
      .get("id")
      ?.endsWith("account-b")
      ? "Bob"
      : "Alice";
    return reply(route, {
      first_name: owner,
      last_name: "Ng",
      handle: owner.toLowerCase(),
    });
  });
  await page.goto("/Profile");
  await expect(page.getByRole("heading", { name: "Alice Ng" })).toBeVisible();
  await page
    .getByRole("region", { name: "Security" })
    .getByRole("button", { name: "Change", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Change password" });
  await dialog
    .getByLabel("New password", { exact: true })
    .fill("fixture-password-a");
  await dialog
    .getByLabel("Confirm new password", { exact: true })
    .fill("fixture-password-a");
  await dialog.getByRole("button", { name: "Update password" }).click();
  await expect.poll(() => Boolean(heldUpdate)).toBe(true);
  expect(heldUpdate.request().headers().authorization).toBe(
    "Bearer fixture-token-account-a",
  );
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "SIGNED_IN", session: value });
      channel.close();
    },
    { key: storageKey, value: session("account-b") },
  );
  await expect(page.getByRole("heading", { name: "Bob Ng" })).toBeVisible();
  await expect(dialog).toBeHidden();
  await reply(heldUpdate, session().user);
  await expect(page.getByRole("heading", { name: "Bob Ng" })).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).user.id,
      storageKey,
    ),
  ).toBe("account-b");
  await expect(
    page.getByText("Password updated successfully.", { exact: true }),
  ).toHaveCount(0);
});
