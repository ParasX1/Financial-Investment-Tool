import { expect, test, type Page } from "@playwright/test";

type RenderedFont = {
  familyName: string;
  isCustomFont: boolean;
  glyphCount: number;
};

// These public presentation checks make no live account or market requests.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === new URL(baseURL!).origin &&
      !url.pathname.startsWith("/api/")
    ) {
      return route.continue();
    }
    return route.abort();
  });
});

async function renderedFonts(page: Page, selector: string) {
  // Computed font-family alone cannot show whether the font request succeeded.
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });
    expect(nodeId).toBeGreaterThan(0);
    const result = await session.send("CSS.getPlatformFontsForNode", {
      nodeId,
    });
    return result.fonts as RenderedFont[];
  } finally {
    await session.detach();
  }
}

async function assertReadablePage(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function assertDialogTextFits(page: Page) {
  const dialog = page.getByRole("dialog");
  expect(
    await dialog
      .locator(".modal-body")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  const title = dialog.locator("#auth-dialog-title");
  await title.scrollIntoViewIfNeeded();
  expect(
    await title.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = [...range.getClientRects()];
      for (
        let parent = element.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        const clip = parent.getBoundingClientRect();
        const clips = (overflow: string) =>
          ["hidden", "auto", "scroll", "clip"].includes(overflow);
        if (
          text.some(
            (rect) =>
              (clips(style.overflowX) &&
                (rect.left < clip.left - 0.5 ||
                  rect.right > clip.right + 0.5)) ||
              (clips(style.overflowY) &&
                (rect.top < clip.top - 0.5 || rect.bottom > clip.bottom + 0.5)),
          )
        )
          return false;
      }
      return text.length > 0;
    }),
  ).toBe(true);
  for (const control of [
    dialog.getByLabel("Email address"),
    dialog.locator('button[type="submit"]'),
  ]) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeInViewport({ ratio: 1 });
  }
}

test("renders the self-hosted font in public pages and the body-mounted dialog", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const opener = page
    .locator("#top")
    .getByRole("button", { name: "Get started", exact: true });
  await expect(opener).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const homeFonts = await renderedFonts(page, "#top h1");
  expect(
    homeFonts.some(
      (font) =>
        font.isCustomFont && font.familyName === "Geist" && font.glyphCount > 0,
    ),
  ).toBe(true);
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Create your FIT account");
  await expect(dialog.getByLabel("First name")).toBeFocused();
  const dialogFonts = await renderedFonts(page, "#auth-dialog-title");
  const labelFonts = await renderedFonts(page, 'label[for="auth-email"]');
  for (const fonts of [dialogFonts, labelFonts]) {
    expect(
      fonts.some(
        (font) =>
          font.isCustomFont &&
          font.familyName === "Geist" &&
          font.glyphCount > 0,
      ),
    ).toBe(true);
  }
  await assertDialogTextFits(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await page.goto("/Guide");
  await expect(
    page.getByRole("heading", { name: "Guide", exact: true, level: 1 }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const guideFonts = await renderedFonts(page, "main h1");
  expect(
    guideFonts.some(
      (font) =>
        font.isCustomFont && font.familyName === "Geist" && font.glyphCount > 0,
    ),
  ).toBe(true);
  await testInfo.attach("rendered-fonts", {
    body: JSON.stringify({ homeFonts, dialogFonts, labelFonts, guideFonts }),
    contentType: "application/json",
  });
});

test("preserves numeric alignment and CJK fallback in a MUI table fixture", async ({
  page,
}, testInfo) => {
  await page.route("**/api/etfs?*", (route) =>
    route.fulfill({
      json: {
        data: {
          rows: [1, 8].map((digit, index) => ({
            rank: index + 1,
            symbol: `FONT${digit}`,
            name: "\u6295\u8d44\u7ec4\u5408\u5b57\u4f53\u6837\u672c",
            category: "Equity",
            issuer: "Example",
            expenseRatio: 0,
            aumUsd: 0,
            priceReturn: digit === 1 ? 1.111 : 8.888,
            volatility: null,
            sharpe: null,
            maxDrawdown: null,
          })),
          total: 2,
        },
        metadata: {
          windowCode: "1Y",
          generatedAt: "2026-10-12T00:00:00Z",
          source: "hardcoded_preview",
          sortKey: "sharpe",
        },
        warnings: [],
      },
    }),
  );
  await page.goto("/ETF");
  const table = page.getByRole("table", { name: "ETF preview rankings" });
  await expect(table).toBeVisible();
  await expect(table).toContainText("FONT1");
  await expect(table).toContainText("FONT8");
  await page.evaluate(() => document.fonts.ready);
  const muiFonts = await renderedFonts(
    page,
    '[aria-label="ETF time window"] button',
  );
  expect(
    muiFonts.some(
      (font) =>
        font.isCustomFont && font.familyName === "Geist" && font.glyphCount > 0,
    ),
  ).toBe(true);
  const priceCells = table.locator("tbody tr td:nth-child(8)");
  await expect(priceCells.nth(0)).toContainText("111.1%");
  await expect(priceCells.nth(1)).toContainText("888.8%");
  const widths = await priceCells.evaluateAll((cells) =>
    cells.map((cell) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      return range.getBoundingClientRect().width;
    }),
  );
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.1);
  const numericFonts = await renderedFonts(
    page,
    'table[aria-label="ETF preview rankings"] tbody tr:first-child td:nth-child(8)',
  );
  expect(
    numericFonts.some(
      (font) => font.familyName === "Geist" && font.glyphCount > 0,
    ),
  ).toBe(true);
  const cjkFonts = await renderedFonts(
    page,
    'table[aria-label="ETF preview rankings"] tbody tr:first-child td:nth-child(3)',
  );
  expect(
    cjkFonts.some((font) => !font.isCustomFont && font.glyphCount > 0),
  ).toBe(true);
  await testInfo.attach("table-fonts-and-widths", {
    body: JSON.stringify({ muiFonts, numericFonts, cjkFonts, widths }),
    contentType: "application/json",
  });
});

for (const fontAvailable of [true, false]) {
  for (const viewport of [
    { width: 320, height: 844, enlargedText: false },
    { width: 390, height: 844, enlargedText: false },
    { width: 320, height: 844, enlargedText: true },
    { width: 390, height: 844, enlargedText: true },
    { width: 1440, height: 900, enlargedText: true },
  ]) {
    test(`keeps public text and dialog focus usable at ${viewport.width}px${viewport.enlargedText ? " with 200% text" : ""} ${fontAvailable ? "with" : "without"} the font`, async ({
      page,
    }, testInfo) => {
      if (!fontAvailable) {
        await page.route("**/fonts/geist/**", (route) => route.abort());
      }
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      if (viewport.enlargedText) {
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
      }
      await assertReadablePage(page);
      const homeFonts = await renderedFonts(page, "#top h1");
      expect(homeFonts.some((font) => font.glyphCount > 0)).toBe(true);
      expect(homeFonts.some((font) => font.isCustomFont)).toBe(fontAvailable);
      await page.screenshot({
        path: testInfo.outputPath("home.png"),
        fullPage: true,
      });
      const opener = page
        .locator("#top")
        .getByRole("button", { name: "Get started", exact: true });
      await opener.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("First name")).toBeFocused();
      await expect(dialog.getByLabel("Email address")).toBeVisible();
      await assertReadablePage(page);
      await assertDialogTextFits(page);
      await page.screenshot({
        path: testInfo.outputPath("dialog.png"),
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
      await page.goto("/Guide");
      await page.evaluate(() => document.fonts.ready);
      if (viewport.enlargedText) {
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
      }
      await assertReadablePage(page);
      const guideFonts = await renderedFonts(page, "main h1");
      expect(guideFonts.some((font) => font.glyphCount > 0)).toBe(true);
      expect(guideFonts.some((font) => font.isCustomFont)).toBe(fontAvailable);
      await testInfo.attach("rendered-fonts", {
        body: JSON.stringify({ homeFonts, guideFonts }),
        contentType: "application/json",
      });
      await page.screenshot({
        path: testInfo.outputPath("guide.png"),
        fullPage: true,
      });
    });
  }
}
