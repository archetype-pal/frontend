import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const SERVER_AUTH_FILES = [
  'app/api/**',
  'proxy.ts',
  'lib/api-fetch.ts',
  'lib/*-server.ts',
  '**/*.test.{ts,tsx}',
];
// Cookies that aren't credentials: the session id and the locale.
const COOKIE_FILES = ['lib/auth-session.ts', 'stores/locale-store.ts'];
const AUTH_HEADER_MESSAGE =
  'Browser code must not send the auth token; use proxyFetch, or authFetch on the server.';
const NO_DOCUMENT_COOKIE = {
  selector: "MemberExpression[object.name='document'][property.name='cookie']",
  message: 'The auth cookie is HttpOnly; read sign-in state from useAuth().',
};
const NO_AUTH_HEADER = [
  { selector: 'Literal[value=/^authorization$/i]', message: AUTH_HEADER_MESSAGE },
  { selector: 'Property > Identifier.key[name=/^authorization$/i]', message: AUTH_HEADER_MESSAGE },
  { selector: 'TemplateElement[value.raw=/^Token /]', message: AUTH_HEADER_MESSAGE },
];

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
  // The auth token is an HttpOnly cookie: browser code can neither read it nor
  // send it. Authenticated browser calls go through `/api/proxy` (`proxyFetch`).
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [...SERVER_AUTH_FILES, ...COOKIE_FILES],
    rules: { 'no-restricted-syntax': ['error', NO_DOCUMENT_COOKIE, ...NO_AUTH_HEADER] },
  },
  {
    files: COOKIE_FILES,
    rules: { 'no-restricted-syntax': ['error', ...NO_AUTH_HEADER] },
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
