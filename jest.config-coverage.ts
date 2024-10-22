import type { Config } from "@jest/types";

export default async (): Promise<Config.InitialOptions> => {
  return {
    preset: "ts-jest",
    testMatch: ["<rootDir>/**/src/**/*.test.ts"],
    collectCoverageFrom: ["src/**/*.ts", "!src/**/index.ts", "!src/tests/*.ts"],
    coverageDirectory: "./coverage/",
    coverageReporters: ["json-summary", "html", "lcov", "lcovonly", "text"],
    coverageThreshold: {
      global: {
        statements: 99,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  };
};
