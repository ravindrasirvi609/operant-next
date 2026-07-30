/**
 * Makes Vitest's global test APIs (`describe`, `it`, `expect`, `vi`, …) visible
 * to the TypeScript compiler.
 *
 * `vitest.config.ts` sets `globals: true`, which injects these at runtime, but
 * `tsc` does not know about them unless this reference is present. Without it,
 * globals-style test files (e.g. `workflow/engine.test.ts`) fail type-checking
 * with "Cannot find name 'describe'". Test files may still import from `vitest`
 * explicitly; both styles work.
 */
/// <reference types="vitest/globals" />
