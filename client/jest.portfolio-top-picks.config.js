const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import("jest").Config} */
const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    "features/portfolio/**/*.{ts,tsx}",
    "features/top-picks/**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!**/index.ts",
    "!features/portfolio/types.ts",
    "!features/portfolio/lib/workspaceModel.ts",
  ],
  coverageDirectory: "<rootDir>/coverage/portfolio-top-picks",
  coverageReporters: ["text", "json-summary"],
  coverageThreshold: {
    "./features/portfolio/": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/PortfolioChart.tsx": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/PortfolioCommandBar.tsx": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/PortfolioFrontierChart.tsx": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/PortfolioMetricCard.tsx": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/PortfolioObservation.tsx": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/components/portfolioObservationGeometry.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/data/portfolioPrefs.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/state/workspaceDefaults.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/portfolio/state/workspaceReducer.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/top-picks/": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/top-picks/data/topPicksPrefsRepository.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./features/top-picks/hooks/useTopPicksController.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/features/portfolio/**/*.test.{ts,tsx}",
    "<rootDir>/features/top-picks/**/*.test.{ts,tsx}",
  ],
};

module.exports = createJestConfig(config);
