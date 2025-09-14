module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:storybook/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // TEMP
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'prefer-const': 'warn',
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    '@next/next/no-img-element': 'warn',
    '@next/next/no-css-tags': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // Temporarily disable any eslint errors for test files
    'no-console': 'warn', // Allow console logs but as a warning
  },
  overrides: [
    // API routes & tests: loosen typing during sprint
    {
      files: ['pages/api/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', '**/_tests_/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files
        // Treat all errors as warnings in tests
        'no-console': 'warn', // Avoid failing build due to console statements in tests
        '@typescript-eslint/no-unused-vars': 'warn', // Allow unused vars in test files but warn
        'prefer-const': 'warn', // Warn instead of error on prefer-const in tests
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'public/',
    '**/*.d.ts',
    'supabase/functions/**',
    '**/tests/**',          // Exclude all test files and directories
    '**/__tests__/**',      // Exclude the __tests__ folder
    '**/_tests_/**',        // Exclude the _tests_ folder
  ],
};
