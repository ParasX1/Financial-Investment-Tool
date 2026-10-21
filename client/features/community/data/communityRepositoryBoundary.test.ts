import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(fileName: string) {
  return readFileSync(
    join(process.cwd(), "features/community/data", fileName),
    "utf8",
  );
}

describe("Community repository boundaries", () => {
  it("keeps the stable repository entrypoint as an orchestration facade", () => {
    const facade = source("communityRepository.ts");

    expect(facade).toContain('from "./communityCurrentRepository"');
    expect(facade).toContain('from "./communityLegacyCompatibility"');
    expect(facade).not.toContain('.from("posts")');
    expect(facade).not.toContain('.from("comments")');
  });

  it("keeps current-schema access independent from legacy fallback policy", () => {
    const currentRepository = source("communityCurrentRepository.ts");
    const legacyCompatibility = source("communityLegacyCompatibility.ts");

    expect(currentRepository).not.toContain("communityLegacyCompatibility");
    expect(legacyCompatibility).not.toContain("communityCurrentRepository");
  });
});
