import crypto from "crypto";
import fs from "fs";
import path from "path";

const clientRoot = process.cwd();
const sourceAssets = path.join(clientRoot, "assets");
const publicAssets = path.join(clientRoot, "public", "assets");
const retainedSourceHashes: Record<string, string> = {
  "SidebarIcons/F.png":
    "57b69ec676172f173f8e3f7500f4b6858fbf7dfd001fe7a4e076ba0974cb5c52",
  "SidebarIcons/FIT.png":
    "e034e640f22fe424583820cfd8445179de81650f8ac5fb3f78b4582057fb5c58",
  "SidebarIcons/community.png":
    "0f5f87644b0598bcb3eaa1baafde369f67edfbbbd37ff48aa6f9d99eb96865f4",
  "SidebarIcons/guide.png":
    "d77ed4fedb0cd1b08d78f3fff4f3140df47cca0e398237bd14ff416749717cbc",
  "SidebarIcons/help.png":
    "218092a5e0259e64358031fdf2ac5c51c26416f8f7bb2a768902214b7fbdf46a",
  "SidebarIcons/home.png":
    "208a45bac2f9d341294b7a2e90332396e5c0ce60041f055cccaf5250c50b1b3f",
  "SidebarIcons/marketNews.png":
    "7f7c0f1930e1fc64cbbd62431a57fe0429d545dca97124374e34f5359b78af17",
  "SidebarIcons/portfolio.png":
    "8e86833c5fc3550621620619cbf071a324cc1331548fd14a212a9cb986698b80",
  "SidebarIcons/profile.png":
    "bc7dd358e01a5224401d26cb1ada3ffc06f8c3e9de183892df961b273f29e42c",
  "SidebarIcons/topPicks.png":
    "e4a8cb334261b412a50e5e7f74f0c561f2907cdb62026067bc372f6e8a73091a",
  "SidebarIcons/watchlist.png":
    "c4fe2f20d4853487558690e8af7a3196da6e348b454847415ad6c5d9442eeb37",
  "footer/Instagram.png":
    "635f7980c57f90f506226f3749dce1f5e3a0a5ab90f74de1b0dcd44db64be23b",
  "footer/LinkedIn.png":
    "9b32a77d1953326f299e11658a4f3174c66710de626f43bac84058b1affde884",
  "footer/Twitter.png":
    "dba4c6ee5ade1cbcc375f8dc0e3cf7f71424b5ab9cf4c61b676592cc8e08dc3b",
  "footer/YouTube.png":
    "27453c091fc6b88db542405253394142dc364e32d16219b6d13e0a34e5e55b16",
  "logo.png":
    "ab416dc10044cd787477575b1f5fa19f97f8bc8e701ff3acd605bd0069540e26",
  "metrics/correlation.png":
    "69d8c9184fc9a7a8502aa72b52c24e27ac058ccda6d3dfc30fd0200c3a84c6dd",
  "metrics/cumulative_returns.png":
    "16a17e8c3bddc94c2935d858f3441b80dfd4fa17c1a2d35095036423fc933b1a",
  "metrics/drawdown.png":
    "2f63210a2df00c9f6d2ad79ac6a7c9915b0e6b3bbc11958c4c7b2ad49d407f65",
  "metrics/sharpe_ratio.png":
    "4f8a20b3be7f7f5641a3ab17cd55333420b8bb6d66bd93bc87ac2c33c6dc564b",
  "metrics/var.png":
    "6d7da39926272f91f13c4d42122e677167d2c161608f727acc60b4b2b8bf3a6e",
  "metrics/volatility.png":
    "8368286e9b2cad322308e95d2dadbac23434a26359e776ccacf44c073a4032df",
  "star.png":
    "4dafd3e6b4e369193363e691333255208a65c03b9ae69e812424886cc4d02e66",
  "team.png":
    "0a9f310ae716400ac69a9e11c44fa12606e589f7aeea9c729e0662e877949054",
};

function listRelativeFiles(root: string, current = root): string[] {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      return listRelativeFiles(root, absolutePath);
    }

    return [path.relative(root, absolutePath).replaceAll("\\", "/")];
  });
}

describe("asset ownership", () => {
  it("keeps source and public asset surfaces without duplicate ownership", () => {
    expect(fs.statSync(sourceAssets).isDirectory()).toBe(true);
    expect(fs.statSync(publicAssets).isDirectory()).toBe(true);

    const sourceFiles = new Set(listRelativeFiles(sourceAssets));
    const publicFiles = listRelativeFiles(publicAssets);
    const overlappingFiles = publicFiles
      .filter((file) => sourceFiles.has(file))
      .sort();

    expect(overlappingFiles).toEqual(["gridBackground1.png"]);
    expect(fs.existsSync(path.join(sourceAssets, "logo.png"))).toBe(true);
    expect(
      fs.existsSync(path.join(publicAssets, "gridBackground1.png")),
    ).toBe(true);
  });

  it("retains the exact source copies verified before deduplication", () => {
    Object.entries(retainedSourceHashes).forEach(
      ([relativePath, expectedHash]) => {
        const contents = fs.readFileSync(path.join(sourceAssets, relativePath));
        const actualHash = crypto
          .createHash("sha256")
          .update(contents)
          .digest("hex");

        expect(actualHash).toBe(expectedHash);
      },
    );
  });
});
