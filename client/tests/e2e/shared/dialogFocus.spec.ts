import { expect, test } from "@playwright/test";
import { wrapDialogTabBoundary } from "../../../components/shared/dialogFocus";

test("wraps actual visible controls around closed and nested details", async ({
  page,
}) => {
  await page.setContent(`
    <button id="outside-before">Outside before</button>
    <div id="dialog" role="dialog" aria-label="Control fixture" tabindex="-1">
      <fieldset disabled><button id="disabled-first">Disabled first</button></fieldset>
      <button id="first">Close</button>
      <input id="email" aria-label="Email">
      <select id="metric" aria-label="Metric"><option>Return</option></select>
      <textarea id="notes" aria-label="Notes"></textarea>
      <a id="link" href="#">Help</a>
      <details><summary id="last">Assumptions</summary>
        <input id="closed-date" type="date" aria-label="Closed date">
        <details><summary id="nested-summary">Nested assumptions</summary>
          <input id="nested-date" type="date" aria-label="Nested date">
        </details>
      </details>
      <button id="disabled-last" disabled>Disabled last</button>
      <button id="hidden-resize" style="display:none">Resize</button>
      <button id="non-tab-stop" tabindex="-1">Programmatic only</button>
    </div>
    <button id="outside-after">Outside after</button>
  `);
  // Inject the actual self-contained helper so native DOM selection, layout,
  // details behavior and keyboard focus are exercised without a mocked DOM.
  await page.addScriptTag({
    content: `document.querySelector('#dialog').addEventListener('keydown', ${wrapDialogTabBoundary.toString()});`,
  });

  await page.locator("#first").focus();
  for (const id of ["email", "metric", "notes", "link", "last", "first"]) {
    await page.keyboard.press("Tab");
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#last")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#first")).toBeFocused();

  // Opening the outer details still leaves the nested closed body excluded.
  await page
    .locator("details")
    .first()
    .evaluate((node) => {
      (node as HTMLDetailsElement).open = true;
    });
  await page.locator("#first").focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#nested-summary")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#first")).toBeFocused();
});

test("leaves an already handled native Tab event alone", async ({ page }) => {
  await page.setContent(`
    <div id="dialog"><button id="first">Close</button><button id="last">Save</button></div>
  `);
  await page.addScriptTag({
    content: `
      document.querySelector('#last').addEventListener('keydown', event => event.preventDefault());
      document.querySelector('#dialog').addEventListener('keydown', ${wrapDialogTabBoundary.toString()});
    `,
  });
  await page.locator("#last").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#last")).toBeFocused();
});

for (const width of [1440, 390]) {
  test(`Observation routes container Tab to its visible edges at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/Portfolio");
    await page
      .getByRole("button", { name: "Observation", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Portfolio Observation mode",
    });
    const first = dialog.getByRole("button", { name: "Auto arrange" });
    const last =
      width > 720
        ? dialog.getByRole("button", { name: /^Resize / }).last()
        : dialog.locator("summary").last();

    await dialog.focus();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    await dialog.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(last).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
  });
}
