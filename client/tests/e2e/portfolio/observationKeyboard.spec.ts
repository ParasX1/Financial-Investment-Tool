import { expect, test, type Locator, type Page } from "@playwright/test";

const openObservation = async (page: Page) => {
  await page.goto("/Portfolio");
  const trigger = page.getByRole("button", {
    name: "Observation",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Portfolio Observation mode",
  });
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
};

const expectFocusInside = async (dialog: Locator) => {
  await expect
    .poll(() =>
      dialog.evaluate((node) => node.contains(document.activeElement)),
    )
    .toBe(true);
};

test("Observation transfers, traps and restores keyboard focus on Done and Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { dialog, trigger } = await openObservation(page);
  const done = dialog.getByRole("button", { name: "Done", exact: true });
  await expect(done).toBeFocused();

  const first = dialog.getByRole("button", { name: "Auto arrange" });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(dialog);
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();

  await done.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(done).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Observation moves and resizes with arrow keys, preserves geometry and canvas limits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { dialog, trigger } = await openObservation(page);
  const observationWindow = dialog.getByRole("region", {
    name: "Cumulative return window",
    exact: true,
  });
  const move = observationWindow.getByRole("button", {
    name: "Move Cumulative return window",
  });
  const resize = observationWindow.getByRole("button", {
    name: "Resize Cumulative return window",
  });
  await expect(move).toHaveAccessibleDescription(/arrow keys.*10.*Shift.*50/i);
  const initial = await observationWindow.boundingBox();
  expect(initial).not.toBeNull();

  await resize.focus();
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(async () => (await observationWindow.boundingBox())?.width)
    .toBe(initial!.width - 10);
  await page.keyboard.press("Shift+ArrowUp");
  await expect
    .poll(async () => (await observationWindow.boundingBox())?.height)
    .toBe(initial!.height - 50);
  await move.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => (await observationWindow.boundingBox())?.x)
    .toBe(initial!.x + 10);
  await page.keyboard.press("Shift+ArrowDown");
  await expect
    .poll(async () => (await observationWindow.boundingBox())?.y)
    .toBe(initial!.y + 50);

  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
  }
  const canvas = await dialog
    .locator('[class*="observationCanvas"]')
    .boundingBox();
  const constrained = await observationWindow.boundingBox();
  expect(canvas).not.toBeNull();
  expect(constrained).not.toBeNull();
  expect(constrained!.x + constrained!.width).toBeLessThanOrEqual(
    canvas!.x + canvas!.width,
  );
  expect(constrained!.y + constrained!.height).toBeLessThanOrEqual(
    canvas!.y + canvas!.height,
  );

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(observationWindow).toHaveCSS(
    "left",
    `${constrained!.x - canvas!.x}px`,
  );
  await expect(observationWindow).toHaveCSS(
    "top",
    `${constrained!.y - canvas!.y}px`,
  );
  await expect(observationWindow).toHaveCSS("width", `${constrained!.width}px`);
  await expect(observationWindow).toHaveCSS(
    "height",
    `${constrained!.height}px`,
  );
});

test("Observation keeps native settings usable and Escape closes from an input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { dialog, trigger } = await openObservation(page);
  // The metric's accessible name changes when the native select changes it.
  const observationWindow = dialog.locator("section[data-card-id]").first();
  const metric = observationWindow.getByRole("combobox").first();
  const selected = await metric.inputValue();
  await metric.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(metric).not.toHaveValue(selected);
  await expectFocusInside(dialog);

  const assumptions = observationWindow.locator("details").filter({
    has: page.locator("summary", { hasText: "Override linked assumptions" }),
  });
  await assumptions.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(assumptions).toHaveAttribute("open", "");
  const dateInput = assumptions.getByLabel("From", { exact: true });
  await dateInput.focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Observation contains focus through both Tab boundaries on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { dialog, trigger } = await openObservation(page);
  await expect(
    dialog.getByRole("button", { name: "Done", exact: true }),
  ).toBeFocused();
  const first = dialog.getByRole("button", { name: "Auto arrange" });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expectFocusInside(dialog);
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Observation releases its focus trap when a card opens Focus mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { dialog, trigger } = await openObservation(page);
  await dialog
    .getByRole("button", { name: "Focus Cumulative return", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Focus mode", exact: true }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .not.toBe("BODY");
});

test("Observation reconciles windows when the viewport shrinks after its portal opens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { dialog } = await openObservation(page);
  // Resize before any card receives focus or changes its saved geometry.
  await page.setViewportSize({ width: 800, height: 450 });
  await expect
    .poll(() =>
      dialog.evaluate((node) => {
        const canvas = node
          .querySelector('[class*="observationCanvas"]')!
          .getBoundingClientRect();
        return [...node.querySelectorAll('[class*="observationWindow"]')].every(
          (element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.left >= canvas.left &&
              rect.top >= canvas.top &&
              rect.right <= canvas.right &&
              rect.bottom <= canvas.bottom
            );
          },
        );
      }),
    )
    .toBe(true);
  await expect(
    dialog.getByRole("button", { name: "Done", exact: true }),
  ).toBeFocused();
});
