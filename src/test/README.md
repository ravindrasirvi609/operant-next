# Test utilities & conventions

Shared scaffolding for the UMIS test suite. See [`docs/14_Testing_Strategy.md`](../../docs/14_Testing_Strategy.md) for the overall strategy.

## Running tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # run with a v8 coverage report (text + ./coverage/index.html)
npm run typecheck     # tsc --noEmit (includes test files)
```

## Two kinds of test

| Kind | File name | Touches DB? | Speed | Use for |
|---|---|---|---|---|
| **Unit** | `*.test.ts` | No | ms | Pure functions, Zod schemas, mock-based service logic |
| **Integration** | `*.integration.test.ts` | Yes (in-memory) | seconds | Real Mongoose models, queries, indexes, persistence lifecycles |

Both use Vitest globals (`describe`/`it`/`expect`/`vi`) — no import needed (typed via `src/types/vitest.d.ts`). Importing them from `"vitest"` also works.

## Writing a unit test

Mock the boundaries (DB, session, models) with `vi.hoisted` + `vi.mock`. See [`src/lib/auth/user.test.ts`](../lib/auth/user.test.ts) for the canonical pattern. Use `vi.stubEnv("NODE_ENV", "production")` to vary the environment (never assign `process.env.NODE_ENV` directly — it is read-only in the types) and restore with `vi.unstubAllEnvs()` in `afterEach`.

## Writing an integration test

Use the in-memory MongoDB harness ([`db.ts`](./db.ts)). It points the application's own `dbConnect()` at an ephemeral `mongod`, so you test the real code path.

```ts
import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import WorkflowInstance from "@/models/core/workflow-instance";
import { syncWorkflowInstanceState } from "@/lib/workflow/engine";

beforeAll(async () => { await setupTestDatabase(); }); // starts mongod (cold start can take ~10s)
afterAll(async () => { await teardownTestDatabase(); });
afterEach(async () => { await clearDatabase(); });     // isolate cases; keeps indexes

it("persists a workflow instance", async () => {
    await syncWorkflowInstanceState({ moduleName: "PBAS", recordId: "x", status: "Submitted" });
    expect(await WorkflowInstance.countDocuments()).toBe(1);
});
```

Worked example: [`src/lib/workflow/engine.integration.test.ts`](../lib/workflow/engine.integration.test.ts).

### Notes
- The first run downloads a `mongod` binary (cached under `node_modules/.cache`). `vitest.config.ts` raises `hookTimeout` to 120s to absorb the cold start.
- Vitest isolates each file, so every integration file gets its own `mongod` + connection — no cross-file leakage. If integration files multiply, consider a shared Vitest `globalSetup` singleton to avoid one server per file.

## Fixtures

Build test data with the typed factories in [`factories.ts`](./factories.ts) rather than inline literals — they give correct types for free and centralise schema changes:

```ts
import { makeWorkflowDefinition, makeWorkflowStage } from "@/test/factories";

const definition = makeWorkflowDefinition();                       // default 3-stage chain
const custom = makeWorkflowDefinition({ stages: [makeWorkflowStage({ status: "Submitted" })] });
```
