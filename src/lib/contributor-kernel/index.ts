/**
 * Contributor Module Kernel — public API.
 *
 * A single, config-driven implementation of the contributor submit/review
 * workflow shared by the six NAAC criterion modules. See
 * `docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md` for the migration plan and
 * `src/lib/contributor-kernel/README.md` for usage.
 *
 * Wave 1: exists beside the current modules, imported by none of them.
 */
export * from "./types";
export * from "./review";
export * from "./scope";
export * from "./service";
