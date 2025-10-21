import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import noInlineStylePlugin from './tools/eslint-rules/no-inline-style.js';

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
];
