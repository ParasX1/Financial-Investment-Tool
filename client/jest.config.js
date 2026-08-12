const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
  verbose: true,
};

module.exports = createJestConfig(config);
