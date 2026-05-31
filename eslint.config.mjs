import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // eslint-config-next 16.2.x ships eslint-plugin-react-hooks v6, which
      // turns on the React Compiler rule set at error level. Adopting these
      // across the existing codebase is a focused refactor, not part of a
      // dependency bump, so they are deferred here:
      //  - set-state-in-effect: already enforced (suppressed inline where
      //    intentional); kept visible as a warning rather than blocking CI.
      //  - refs / immutability / preserve-manual-memoization: net-new rules,
      //    not yet adopted — off until a dedicated React Compiler pass.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  globalIgnores([
    '.claude/**',
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'node_modules/**',
    'types/**/*.d.ts',
    'tailwind.config.*',
    'postcss.config.*',
  ]),
]);
