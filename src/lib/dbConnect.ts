import mongoose from "mongoose";

import { getMongoUri } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Cached Mongoose connection for Next.js.
 *
 * In development, Next.js hot-reloads and re-evaluates modules, which would
 * create multiple Mongoose connections. We cache the connection (and its
 * in-flight promise) on `globalThis` so a single connection persists across hot
 * reloads and concurrent callers share one connect attempt.
 */

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // `var` is required here so the cache attaches to `globalThis` and survives
    // Next.js hot reloads.
    var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache ?? {
    conn: null,
    promise: null,
};

if (!globalThis.mongooseCache) {
    globalThis.mongooseCache = cached;
}

/**
 * Extract the credential-free host from a MongoDB URI for safe logging.
 *
 * Never log the full URI: it contains the username and password. We log only
 * the host so an operator can confirm *which* cluster was reached.
 */
function safeHost(uri: string): string {
    try {
        return new URL(uri).host || "unknown-host";
    } catch {
        return "unknown-host";
    }
}

/**
 * Establish (or reuse) the shared Mongoose connection.
 *
 * @returns the connected Mongoose instance.
 * @throws if `MONGODB_URI` is missing or the connection cannot be established.
 */
async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const mongoUri = getMongoUri();

        cached.promise = mongoose
            .connect(mongoUri, { bufferCommands: false })
            .then((instance) => {
                logger.info({ host: safeHost(mongoUri) }, "MongoDB connected");
                return instance;
            })
            .catch((error) => {
                // Clear the cached promise so the next caller can retry instead of
                // permanently reusing a rejected promise.
                cached.promise = null;
                logger.error({ err: error, host: safeHost(mongoUri) }, "MongoDB connection failed");
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
