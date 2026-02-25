import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import noInlineStylePlugin from './tools/eslint-rules/no-inline-style.js';
import noChromeOnAttempts from './tools/eslint-rules/no-chrome-on-attempts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    plugins: {
      '@typescript-eslint': tseslint,
      'ds-guard': noInlineStylePlugin,
    },
    rules: {
      'ds-guard/no-inline-style': [
        'error',
        {
          allowElements: ['svg', 'path'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      gramorx: noChromeOnAttempts,
    },
    rules: {
      'gramorx/no-chrome-on-attempts': 'error',
    },
  },
  {
    files: [
      'pages/premium/listening/[slug].tsx',
      'pages/premium/reading/[slug].tsx',
      'pages/writing/mock/[mockId]/workspace.tsx',
      'pages/mock/reading/[slug].tsx',
      'pages/mock/listening/[id].tsx',
      'pages/reading/[slug].tsx',
      'pages/listening/[slug].tsx',
      'pages/speaking/simulator/**/*.tsx',
      'pages/speaking/attempts/[attemptId]/**/*.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/components/Header', message: 'No global chrome in attempt pages.' },
            { name: '@/components/Footer', message: 'No global chrome in attempt pages.' },
            { name: '@/components/Layout', message: 'No global chrome in attempt pages.' },
          ],
          patterns: ['@/components/layouts/*'],
        },
      ],
    },
  },
];
