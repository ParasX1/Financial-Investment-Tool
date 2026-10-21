import { describe, expect, it } from "@jest/globals";
import {
  getSymbolAliases,
  inferRelatedSymbolsFromText,
} from "./symbolAliases";

describe("news symbol aliases", () => {
  it("supports BTC-USD query matching without assigning a quote currency to generic Bitcoin coverage", () => {
    expect(getSymbolAliases("BTC-USD")).toEqual(
      expect.arrayContaining(["BTC-USD", "Bitcoin", "BTC"]),
    );
    expect(
      inferRelatedSymbolsFromText("Bitcoin rises after a volatile week"),
    ).toEqual([]);
  });

  it("only infers crypto pairs when the article names the quote currency", () => {
    expect(
      inferRelatedSymbolsFromText(
        "Bitcoin USD (BTC-USD) gains while Bitcoin AUD is unchanged",
      ),
    ).toEqual(["BTC-USD", "BTC-AUD"]);
  });

  it("keeps high-confidence company matches and refuses ambiguous share classes", () => {
    expect(
      inferRelatedSymbolsFromText(
        "NVIDIA unveils its next generation of data-centre chips",
      ),
    ).toEqual(["NVDA"]);
    expect(
      inferRelatedSymbolsFromText("Alphabet reports quarterly earnings"),
    ).toEqual([]);
  });

  it("does not infer symbols from generic language", () => {
    expect(
      inferRelatedSymbolsFromText("Investors say wow after the market rally"),
    ).toEqual([]);
    expect(
      inferRelatedSymbolsFromText("The metadata was updated overnight"),
    ).toEqual([]);
    expect(
      inferRelatedSymbolsFromText(
        "The team shares a meta analysis of product strategy",
      ),
    ).toEqual([]);
    expect(
      inferRelatedSymbolsFromText(
        "THE TEAM SHARES A META ANALYSIS OF STOCK RESULTS",
      ),
    ).toEqual([]);
  });

  it("still accepts explicit ticker syntax for ambiguous word-like symbols", () => {
    expect(
      inferRelatedSymbolsFromText(
        "$TEAM shares rise while $META stock gains after earnings",
      ),
    ).toEqual(["META", "TEAM"]);
  });
});
