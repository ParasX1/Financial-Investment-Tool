import type { QuantRunForm } from "../types";
import { validateQuantRunForm } from "./useQuantAnalysisController";

const formWithSymbol = (symbol: string): QuantRunForm => ({
  symbol,
  benchmark: "SPY",
  period: "6mo",
  interval: "1d",
  objective: "signal_scan",
  riskProfile: "balanced",
});

describe("validateQuantRunForm", () => {
  it.each([
    "BHP.AX",
    "^AXJO",
    "BRK.B",
    "BTC-USD",
    "EURUSD=X",
    "0700.HK",
    "  bhp.ax  ",
  ])("accepts the backend-supported ticker %s", (symbol) => {
    expect(
      validateQuantRunForm(formWithSymbol(symbol), 20).symbol,
    ).toBeUndefined();
  });

  it.each(["AAPL:US", "BRK_B", ".AAPL", "-AAPL", "=AAPL"])(
    "rejects the backend-unsupported ticker %s",
    (symbol) => {
      expect(
        validateQuantRunForm(formWithSymbol(symbol), 20).symbol,
      ).toBeDefined();
    },
  );

  it("enforces the canonical backend maximum even if a stale capability is larger", () => {
    expect(
      validateQuantRunForm(formWithSymbol("ABCDEFGHIJKLMNOP"), 20).symbol,
    ).toContain("15 characters or fewer");
  });
});
