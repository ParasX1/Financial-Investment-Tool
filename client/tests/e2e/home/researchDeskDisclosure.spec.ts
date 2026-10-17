import { expect, test, type Locator } from "@playwright/test";

const metrics = ["return", "volatility", "drawdown"] as const;

async function geometry(card: Locator) {
  return card.evaluate((element) => {
    const bounds = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      card: bounds(element),
      chart: bounds(element.querySelector("[data-research-chart]")!),
      button: bounds(element.querySelector("button")!),
      summary: bounds(element.querySelector("summary")!),
    };
  });
}

for (const width of [901, 1440, 3440]) {
  test(`expands each research method without moving sibling cards at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const cards = metrics.map((metric) =>
      page.locator(`[data-research-metric="${metric}"]`),
    );
    for (const card of cards) {
      await expect(card.locator("[data-research-chart] svg")).toBeVisible();
      await expect(card.locator("details")).toHaveJSProperty("open", false);
    }

    const evidence = [];
    for (const [openedIndex, metric] of metrics.entries()) {
      const before = await Promise.all(cards.map(geometry));
      const selected = cards[openedIndex];
      await selected.locator("summary").click();
      await expect(selected.locator("details")).toHaveJSProperty("open", true);
      await expect(selected.getByRole("table")).toBeVisible();
      const after = await Promise.all(cards.map(geometry));
      evidence.push({ metric, before, after });

      expect
        .soft(after[openedIndex].card.height)
        .toBeGreaterThan(before[openedIndex].card.height);
      for (const [index, sibling] of cards.entries()) {
        if (index === openedIndex) continue;
        await expect(sibling.locator("details")).toHaveJSProperty(
          "open",
          false,
        );
        for (const part of ["card", "chart", "button", "summary"] as const) {
          for (const dimension of ["x", "y", "width", "height"] as const) {
            expect
              .soft(
                after[index][part][dimension],
                `${metric} disclosure must preserve ${metrics[index]} ${part} ${dimension}`,
              )
              .toBeCloseTo(before[index][part][dimension], 1);
          }
        }
      }

      await selected.locator("summary").click();
      await expect(selected.locator("details")).toHaveJSProperty("open", false);
    }

    // Native disclosures can also stay open together; opening one must not
    // toggle another or move the content of a card already being inspected.
    for (const [openedIndex] of metrics.entries()) {
      const before = await Promise.all(cards.map(geometry));
      await cards[openedIndex].locator("summary").click();
      for (const [index, sibling] of cards.entries()) {
        await expect(sibling.locator("details")).toHaveJSProperty(
          "open",
          index <= openedIndex,
        );
        if (index === openedIndex) continue;
        expect(await geometry(sibling)).toEqual(before[index]);
      }
    }

    await testInfo.attach(`disclosure-geometry-${width}`, {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json",
    });
  });
}
