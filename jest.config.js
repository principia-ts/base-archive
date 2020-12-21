// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["packages/**/src/**/*.ts"],
  setupFiles: ["./scripts/jest-setup.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/packages/.*/dist",
    "<rootDir>/packages/.*/compiler-debug",
    "<rootDir>/_tmp"
  ],
  verbose: true,
  moduleNameMapper: {
    "@principia/model/(.*)$": "<rootDir>/packages/model/dist/dist/cjs/$1",
    "@principia/model$": "<rootDir>/packages/model/dist/dist/cjs",
    "@principia/optics/(.*)$": "<rootDir>/packages/optics/dist/dist/cjs/$1",
    "@principia/optics$": "<rootDir>/packages/optics/dist/dist/cjs",
    "@principia/prelude/(.*)$": "<rootDir>/packages/prelude/dist/dist/cjs/$1",
    "@principia/prelude$": "<rootDir>/packages/prelude/dist/dist/cjs",
    "@principia/core/(.*)$": "<rootDir>/packages/core/dist/dist/cjs/$1",
    "@principia/core$": "<rootDir>/packages/core/dist/dist/cjs",
    "@principia/node/(.*)$": "<rootDir>/packages/node/dist/dist/cjs/$1",
    "@principia/node$": "<rootDir>/packages/node/dist/dist/cjs",
    "@principia/compile/(.*)$": "<rootDir>/packages/compile/dist/dist/cjs/$1",
    "@principia/compile$": "<rootDir>/packages/compile/dist/dist/cjs",
    "@principia/test$": "<rootDir>/packages/test/dist/dist/cjs",
    "@principia/test/(.*)$": "<rootDir>/packages/test/dist/dist/cjs/$1"
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      compiler: "ttypescript"
    }
  }
};
