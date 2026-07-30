import { S3Client } from "@aws-sdk/client-s3";

import { getR2Credentials } from "@/lib/env";

/**
 * Build the S3-compatible client for Cloudflare R2.
 *
 * Credentials come from the validated environment accessor
 * ({@link getR2Credentials}), which throws a consistent, actionable error if any
 * required variable is missing.
 */
function createR2Client(): S3Client {
    const { accountId, accessKeyId, secretAccessKey } = getR2Credentials();

    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}

// Singleton — reuse across requests in the same server process.
let _client: S3Client | null = null;

/** Get the shared R2 client, constructing it on first use. */
export function getClient(): S3Client {
    if (!_client) _client = createR2Client();
    return _client;
}
