import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => {
    return {
        preset: 'ts-jest',
        verbose: true,
        testEnvironment: "node",
        resetMocks: true,
        testPathIgnorePatterns: ["/dist", "/node_modules"],
        restoreMocks: true,
        globals: { "ts-jest": { packageJson: "package.json" } },
        testMatch: ['<rootDir>/**/src/**/*.it.ts'],
    };
};
