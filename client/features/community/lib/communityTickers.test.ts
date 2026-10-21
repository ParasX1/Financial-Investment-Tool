import {
  normalizeCommunityTickers,
  parseCommunityTickerInput,
  validateCommunityTickers,
} from "./communityTickers";

describe("Community ticker helpers", () => {
  it("parses comma, whitespace, and newline separated ticker input", () => {
    expect(
      parseCommunityTickerInput(" nvda, $msft  \n cba.ax  bhp.ax "),
    ).toEqual(["NVDA", "MSFT", "CBA.AX", "BHP.AX"]);
  });

  it("normalizes, deduplicates, and caps explicit tickers at four", () => {
    expect(
      normalizeCommunityTickers([
        " nvda ",
        "$MSFT",
        "NVDA",
        "CBA.AX",
        "BHP.AX",
        "TLS.AX",
      ]),
    ).toEqual(["NVDA", "MSFT", "CBA.AX", "BHP.AX"]);
  });

  it("explains invalid or excessive explicit ticker selections", () => {
    expect(validateCommunityTickers(["NVDA", "bad symbol"])).toBe(
      "Enter valid tickers, such as CBA.AX or NVDA.",
    );
    expect(
      validateCommunityTickers(["NVDA", "MSFT", "CBA.AX", "BHP.AX", "TLS.AX"]),
    ).toBe("Add up to 4 tickers.");
    expect(
      validateCommunityTickers(["NVDA", "MSFT", "CBA.AX", "BHP.AX", "NVDA"]),
    ).toBeNull();
    expect(validateCommunityTickers(["NVDA", "MSFT"])).toBeNull();
  });
});
