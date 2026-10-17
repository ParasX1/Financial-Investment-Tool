import { expect, test, type Page } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

const projectUrl = "https://watchlist-e2e.supabase.co";

function fixtureSession() {
  const timestamp = new Date().toISOString();
  return {
    access_token: "home-e2e-access-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    refresh_token: "home-e2e-refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: { provider: "email", providers: ["email"] },
      aud: "authenticated",
      created_at: timestamp,
      email: "home-fixture@example.invalid",
      email_confirmed_at: timestamp,
      id: "11111111-1111-4111-8111-111111111111",
      identities: [],
      is_anonymous: false,
      role: "authenticated",
      updated_at: timestamp,
      user_metadata: {},
    },
  };
}

async function assertNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function mockPasswordSignIn(page: Page) {
  await page.route(`${projectUrl}/auth/v1/token?grant_type=password`, (route) =>
    route.fulfill({ json: fixtureSession() }),
  );
  await page.route(`${projectUrl}/auth/v1/user`, (route) =>
    route.fulfill({ json: fixtureSession().user }),
  );
  await page.route(`${projectUrl}/rest/v1/**`, (route) =>
    route.fulfill({ json: [] }),
  );
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 1280, height: 600 },
]) {
  test(`keeps Home readable and entry actions reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Your portfolio. A clearer perspective.",
      }),
    ).toBeVisible();
    const hero = page.locator("#top");
    const start = hero.getByRole("button", {
      name: "Get started",
      exact: true,
    });
    await expect(start).toBeEnabled();
    await expect(
      page
        .getByRole("navigation", { name: "Home", exact: true })
        .getByRole("button", {
          name: viewport.width <= 500 ? "Sign in" : "Get started",
          exact: true,
        }),
    ).toBeInViewport({ ratio: 1 });
    if (viewport.height >= 720 || viewport.width <= 390) {
      await expect(start).toBeInViewport({ ratio: 1 });
    } else {
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport({ ratio: 1 });
    }
    await assertNoOverflow(page);
    const preview = page.getByRole("figure", {
      name: "Compare companies across return and risk.",
    });
    await expect(preview).toContainText("Historical sample");
    for (const label of [
      "Cumulative return",
      "Annualised volatility",
      "Drawdown history",
    ]) {
      await expect(
        preview.getByRole("heading", { name: label, exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: testInfo.outputPath("home.png"),
      fullPage: true,
    });
  });
}

test("opens hero signup and navigation signin distinctly and restores the opener", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator("#top");
  const start = hero.getByRole("button", { name: "Get started", exact: true });
  await start.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(start).toBeFocused();
  await page
    .getByRole("navigation", { name: "Home", exact: true })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(dialog).toHaveAccessibleName("Welcome back");
  await expect(dialog.getByLabel("Email address")).toBeFocused();
});

for (const width of [320, 390]) {
  test(`keeps signin and signup reachable with enlarged text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    const navigation = page.getByRole("navigation", {
      name: "Home",
      exact: true,
    });
    const start = page.locator("#top").getByRole("button", {
      name: "Get started",
      exact: true,
    });
    const signIn = navigation.getByRole("button", {
      name: "Sign in",
      exact: true,
    });
    await assertNoOverflow(page);
    await expect(signIn).toBeInViewport({ ratio: 1 });
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeInViewport({ ratio: 1 });
    await start.click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Create your FIT account",
    );
  });
}

for (const destination of [
  { label: "Portfolio", action: "Explore portfolio", href: "/Portfolio" },
  { label: "Top Picks", action: "Explore top picks", href: "/TopPicks" },
  { label: "Watchlist", action: "Open watchlist", href: "/Watchlist" },
  { label: "Market News", action: "Read market news", href: "/MarketNews" },
  { label: "Community", action: "Explore community", href: "/Community" },
]) {
  test(`retains the guest ${destination.label} destination through mocked signin`, async ({
    page,
  }) => {
    await mockPasswordSignIn(page);
    await page.goto("/");
    await page
      .locator("#product")
      .getByRole("button", {
        name: `${destination.action}, sign in required`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAccessibleName("Welcome back");
    await dialog
      .getByLabel("Email address")
      .fill("home-fixture@example.invalid");
    await dialog
      .getByLabel("Password", { exact: true })
      .fill("local UI fixture password");
    await dialog.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`${destination.href}$`));
    await expect(dialog).toBeHidden();
  });
}

test("renders direct destinations for a restored signed-in fixture", async ({
  page,
}) => {
  await installWatchlistMockBackend(page);
  await page.goto("/");
  const hero = page.locator("#top");
  await expect(
    hero.getByRole("link", { name: "Open portfolio" }),
  ).toHaveAttribute("href", "/Portfolio");
  await expect(hero.getByRole("button", { name: "Get started" })).toHaveCount(
    0,
  );
  const product = page.locator("#product");
  for (const href of [
    "/Portfolio",
    "/TopPicks",
    "/Watchlist",
    "/MarketNews",
    "/Community",
  ]) {
    await expect(product.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await expect(
    product.getByRole("button", { name: /sign in required$/ }),
  ).toHaveCount(0);
  await expect(
    product.getByRole("button", {
      name: /^Inspect (return|volatility|drawdown)$/,
    }),
  ).toHaveCount(3);
  await hero.getByRole("link", { name: "Open portfolio" }).click();
  await expect(page).toHaveURL(/\/Portfolio$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("preserves Watchlist intent through auth mode changes and the dialog keyboard loop", async ({
  page,
}) => {
  await mockPasswordSignIn(page);
  await page.goto("/");
  const opener = page.locator("#product").getByRole("button", {
    name: "Open watchlist, sign in required",
    exact: true,
  });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  const modes = dialog.getByRole("group", { name: "Account access" });
  await expect(dialog.getByLabel("Email address")).toBeFocused();
  await modes
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(dialog.getByLabel("First name")).toBeFocused();
  await modes.getByRole("button", { name: "Sign in", exact: true }).click();
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
  await page.keyboard.press("Enter");
  await dialog.getByLabel("Email address").fill("home-fixture@example.invalid");
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("local UI fixture password");
  await dialog.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Watchlist$/);
});

test("locks entry during session restoration and recovers when it finishes", async ({
  page,
}) => {
  const session = fixtureSession();
  await page.addInitScript(
    (stored) => {
      localStorage.setItem(
        "sb-watchlist-e2e-auth-token",
        JSON.stringify(stored),
      );
    },
    { ...session, expires_at: Math.floor(Date.now() / 1000) - 60 },
  );
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `${projectUrl}/auth/v1/token?grant_type=refresh_token`,
    async (route) => {
      await responseGate;
      await route.fulfill({ json: session });
    },
  );
  await page.goto("/");
  await expect(
    page.locator("#top").getByRole("button", { name: "Get started" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Explore portfolio, sign in required" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Explore top picks, sign in required" }),
  ).toBeDisabled();
  await expect(
    page.locator("#product").getByRole("button", {
      name: "Open watchlist, sign in required",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Read market news, sign in required",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Explore community, sign in required",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toBeHidden();
  release();
  await expect(
    page.locator("#top").getByRole("link", { name: "Open portfolio" }),
  ).toBeVisible();
});

test.describe("Home without JavaScript", () => {
  // Framework-owned cleanup keeps an action timeout as the reported failure.
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  test("keeps landing information and public navigation visible without JavaScript", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Your portfolio. A clearer perspective.",
      }),
    ).toBeVisible();
    await expect(
      page.locator("#top").getByRole("button", { name: "Get started" }),
    ).toBeDisabled();
    await expect(
      page.getByText(/Enable JavaScript to sign in or create an account/),
    ).toBeVisible();
    await expect(page.getByText(/Historical sample/).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Read the guide", exact: false }),
    ).toHaveAttribute("href", "/Guide");
    await expect(
      page.getByRole("link", { name: "Help Center", exact: true }),
    ).toHaveAttribute("href", "/Help");
    await page.getByRole("link", { name: "Features", exact: true }).click();
    await expect(page).toHaveURL(/#product$/);
    // The hash updates before Bootstrap's smooth anchor scroll settles.
    await expect
      .poll(() =>
        page
          .locator("#product")
          .evaluate((element) =>
            Math.abs(
              element.getBoundingClientRect().top -
                parseFloat(getComputedStyle(element).scrollMarginTop),
            ),
          ),
      )
      .toBeLessThan(1);
    await assertNoOverflow(page);
    await expect(
      page.getByText(/Topic navigation and analytics also require JavaScript/),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Read the guide", exact: false })
      .click();
    await expect(page).toHaveURL(/\/Guide$/);
    await expect(
      page.getByRole("heading", { name: "Sharpe Ratio", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText(
      "The Sharpe Ratio shows",
    );
    await page.goto("/");
    await page.getByRole("link", { name: "Help Center", exact: true }).click();
    await expect(page).toHaveURL(/\/Help$/);
    await expect(
      page.getByRole("heading", { name: "Login and Signup", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("How do I log in?");
  });
});

test("honors reduced motion and the skip-link keyboard path", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // Document load can precede interactive hydration. Keep the first Tab intact.
  await expect(
    page
      .locator("#top")
      .getByRole("button", { name: "Get started", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  for (const selector of [
    '#top [class*="heroContent"]',
    '#top [class*="signatureField"]',
    "#product figure",
  ]) {
    expect(
      await page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
  }
  expect(
    await page
      .locator("#main-content")
      .evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
});
