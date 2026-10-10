import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Community route feature boundaries", () => {
  it("routes Feed and Create through dedicated screens", () => {
    const feedRoute = source("pages/Community.tsx");
    const createRoute = source("pages/CommunityCreate.tsx");
    const publicApi = source("features/community/index.ts");

    expect(feedRoute).toContain("CommunityFeedScreen");
    expect(feedRoute).not.toContain("CommunityCreateScreen");
    expect(createRoute).toContain("CommunityCreateScreen");
    expect(createRoute).not.toContain("CommunityFeedScreen");
    expect(publicApi).toContain("CommunityFeedScreen");
    expect(publicApi).toContain("CommunityCreateScreen");
    expect(publicApi).not.toContain("CommunityMain");
  });

  it("does not initialize the opposite route lifecycle", () => {
    const feedScreen = source(
      "features/community/screens/CommunityFeedScreen.tsx",
    );
    const createScreen = source(
      "features/community/screens/CommunityCreateScreen.tsx",
    );
    const feedController = source(
      "features/community/hooks/useCommunityFeedController.ts",
    );
    const createController = source(
      "features/community/hooks/useCommunityCreateController.ts",
    );

    expect(feedScreen).toContain("useCommunityFeedController");
    expect(feedController).not.toContain("useCommunityDraft");
    expect(feedController).not.toContain("createCommunityPost");
    expect(createScreen).toContain("useCommunityCreateController");
    expect(createController).not.toContain("useCommunityData");
    expect(createController).not.toContain("useCommunityFeedActions");
  });
});
