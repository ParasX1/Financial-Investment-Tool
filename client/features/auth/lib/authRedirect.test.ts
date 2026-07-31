import { buildAuthRedirectTo } from "./authRedirect";

describe("authRedirect", () => {
  it("builds same-origin OAuth redirect URLs", () => {
    expect(buildAuthRedirectTo("https://fit.example", "/Profile")).toBe(
      "https://fit.example/Profile",
    );
  });

  it("falls back when a redirect path is not internal", () => {
    expect(
      buildAuthRedirectTo("https://fit.example", "https://evil.test"),
    ).toBe("https://fit.example/Portfolio");
    expect(buildAuthRedirectTo("https://fit.example", "//evil.test")).toBe(
      "https://fit.example/Portfolio",
    );
  });
});
