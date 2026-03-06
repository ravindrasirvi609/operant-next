import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGODB_URI environment variable inside .env.local"
    );
}

/**
 * Cached connection for Mongoose in Next.js.
 *
 * In development, Next.js hot-reloads and re-evaluates modules, which would
 * create multiple Mongoose connections. We cache the promise on `globalThis`
 * so it persists across hot reloads.
 */

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

/* eslint-disable no-var */
declare global {
    var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache ?? {
    conn: null,
    promise: null,
};

if (!globalThis.mongooseCache) {
    globalThis.mongooseCache = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI as string, {
            bufferCommands: false,
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
