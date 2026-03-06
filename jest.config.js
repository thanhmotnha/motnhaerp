const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
    testEnvironment: 'node',
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    testMatch: ['**/__tests__/**/*.test.{js,ts}', '**/*.test.{js,ts}'],
    collectCoverageFrom: [
        'app/api/**/*.js',
        'lib/**/*.js',
        '!lib/auth.js',
        '!node_modules/**',
    ],
    setupFilesAfterSetup: ['<rootDir>/jest.setup.js'],
};

module.exports = createJestConfig(customJestConfig);
