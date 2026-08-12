import QuantAnalysisPage from "@/pages/QuantAnalysis";
import { QuantAnalysisScreen } from "@/features/quant-analysis";
import { SIDEBAR_MAIN_NAV_ITEMS } from "@/components/navigation/sidebarNavigation";

describe("Quant Analysis page boundary", () => {
  it("keeps the Next page thin and exposes Quant Studio in primary navigation", () => {
    expect(QuantAnalysisPage).toBe(QuantAnalysisScreen);
    expect(SIDEBAR_MAIN_NAV_ITEMS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/QuantAnalysis",
          label: "Quant Studio",
          gated: true,
        }),
      ]),
    );
  });
});
