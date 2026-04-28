import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.tmp/', '/build/', '/dist/'],
  globalSetup: undefined,
  globalTeardown: undefined,
  testTimeout: 30000,
  setupFilesAfterEnv: [],
};

export default config;
