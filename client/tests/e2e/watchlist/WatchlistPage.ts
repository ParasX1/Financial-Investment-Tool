import { expect, type Locator, type Page } from "@playwright/test";

export class WatchlistPage {
  readonly heading: Locator;
  readonly page: Page;
  readonly symbolSearch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: "Watchlist" });
    this.symbolSearch = page.getByRole("combobox", { name: "Company or ticker" });
  }

  async goto() {
    await this.page.goto("/Watchlist");
    await expect(this.heading).toBeVisible();
  }

  async addCompany(query: string, symbol: string) {
    await this.symbolSearch.fill(query);
    await this.page.getByRole("option", { name: new RegExp(symbol, "i") }).click();
    await expect(
      this.page.getByRole("button", { name: `Edit ${symbol} research note` }),
    ).toBeVisible();
  }

  async editResearch(symbol: string, note: string, targetPrice: string) {
    await this.page
      .getByRole("button", { name: `Edit ${symbol} research note` })
      .click();
    await this.page.getByLabel("Why are you watching this?").fill(note);
    await this.page.getByLabel("Optional research target").fill(targetPrice);
    await this.page.getByRole("button", { name: "Save Research" }).click();
    await expect(
      this.page.getByLabel("My Research List").getByText(note),
    ).toBeVisible();
  }

  async remove(symbol: string) {
    await this.page
      .getByRole("button", { name: `Remove ${symbol} from watchlist` })
      .click();
    await this.page.getByRole("button", { name: "Remove Item" }).click();
    await expect(
      this.page.getByRole("button", { name: `Edit ${symbol} research note` }),
    ).toHaveCount(0);
  }
}
