import {
  hasInvalidPortfolioSymbols,
  normalisePortfolioSymbols,
} from "./PortfolioSymbolInput";

describe("PortfolioSymbolInput helpers", () => {
  it("normalises a user-entered universe and caps it at five symbols", () => {
    expect(
      normalisePortfolioSymbols([
        " aapl ",
        "MSFT",
        "aapl",
        "bad symbol",
        "nvda",
        "brk-b",
        "^axjo",
        "extra",
      ]),
    ).toEqual(["AAPL", "MSFT", "NVDA", "BRK-B", "^AXJO"]);
  });

  it("uses the same first-character ticker rule as the backend", () => {
    expect(
      normalisePortfolioSymbols(["-BRK", "=USD", ".TEST", "^GSPC"]),
    ).toEqual(["^GSPC"]);
    expect(hasInvalidPortfolioSymbols(["-BRK", "=USD", ".TEST"])).toBe(true);
    expect(hasInvalidPortfolioSymbols(["AAPL", "BRK-B", "CBA.AX"])).toBe(false);
  });
});
