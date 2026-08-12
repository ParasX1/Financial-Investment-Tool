const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    "features/watchlist/**/*.{ts,tsx}",
    "pages/Watchlist.tsx",
    "pages/api/market/symbol-search.ts",
    "pages/api/market/watchlist-quotes.ts",
    "lib/server/marketApiGuard.ts",
    "lib/server/yahooQuoteProvider.ts",
    "!features/watchlist/**/*.test.{ts,tsx}",
    "!features/watchlist/types.ts",
  ],
  coverageReporters: ["text", "json-summary"],
  coverageThreshold: {
    global: {
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
    "<rootDir>/features/watchlist/**/*.test.{ts,tsx}",
    "<rootDir>/lib/server/yahooQuoteProvider.test.ts",
  ],
};

module.exports = createJestConfig(config);
