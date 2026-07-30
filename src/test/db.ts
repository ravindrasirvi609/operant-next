/**
 * In-memory MongoDB harness for integration tests.
 *
 * Spins up a real `mongod` via `mongodb-memory-server` and points the
 * application's own `dbConnect()` at it, so integration tests exercise the exact
 * production code path — real Mongoose models, real queries, real indexes — with
 * zero external infrastructure.
 *
 * ## Usage
 *
 * ```ts
 * import { setupTestDatabase, teardownTestDatabase, clearDatabase } from "@/test/db";
 *
 * beforeAll(async () => { await setupTestDatabase(); });
 * afterAll(async () => { await teardownTestDatabase(); });
 * afterEach(async () => { await clearDatabase(); });
 * ```
 *
 * Vitest isolates each test file in its own module registry, so each integration
 * file gets its own `mongod` instance and Mongoose connection — no cross-file
 * interference. If the suite grows large, consider promoting this to a shared
 * Vitest `globalSetup` singleton to avoid starting one server per file.
 *
 * @see vitest.config.ts — `hookTimeout` is raised to accommodate a cold start
 * @see src/lib/dbConnect.ts — the connection this harness redirects
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import dbConnect from "@/lib/dbConnect";

/**
 * A cold `mongod` start on a loaded CI machine or Windows host routinely exceeds
 * the library's 10s default, so we allow a full minute before failing.
 */
const LAUNCH_TIMEOUT_MS = 60_000;

let memoryServer: MongoMemoryServer | null = null;

/** Reset the connection cache that `dbConnect` keeps on `globalThis`. */
function resetConnectionCache(): void {
    globalThis.mongooseCache = { conn: null, promise: null };
}

/**
 * Start an in-memory MongoDB and connect the application to it.
 *
 * Sets `MONGODB_URI` to the ephemeral server and clears the `dbConnect` cache so
 * the app connects to this instance rather than any previously-cached one. Safe
 * to call once per test file (idempotent within a file).
 */
export async function setupTestDatabase(): Promise<void> {
    if (memoryServer) {
        return;
    }

    memoryServer = await MongoMemoryServer.create({
        instance: { launchTimeout: LAUNCH_TIMEOUT_MS },
    });

    process.env.MONGODB_URI = memoryServer.getUri();
    resetConnectionCache();

    // Route the application's own connection helper at the in-memory server.
    await dbConnect();
}

/**
 * Remove all documents from every collection while preserving indexes.
 *
 * Call this in `afterEach` to isolate tests from one another. `deleteMany` is
 * used instead of dropping collections so unique indexes (e.g. workflow
 * definition `moduleName+version`) survive between cases.
 */
export async function clearDatabase(): Promise<void> {
    const { collections } = mongoose.connection;
    await Promise.all(
        Object.values(collections).map((collection) => collection.deleteMany({}))
    );
}

/**
 * Disconnect Mongoose and stop the in-memory server. Call in `afterAll`.
 */
export async function teardownTestDatabase(): Promise<void> {
    await mongoose.disconnect();

    if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
    }

    resetConnectionCache();
}
