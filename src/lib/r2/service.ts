import { createHash } from "node:crypto";

import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getR2BucketName, getR2PublicUrl } from "@/lib/env";
import { getClient } from "@/lib/r2/client";

/** The R2 bucket name for object operations (validated env accessor). */
export function getBucketName(): string {
    return getR2BucketName();
}

/** Build the public, browser-facing URL for a stored object key. */
export function publicUrl(key: string): string {
    return `${getR2PublicUrl().replace(/\/$/, "")}/${key}`;
}

export async function createPresignedUploadUrl(
    key: string,
    contentType: string,
    ttlSeconds = 900
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(getClient(), command, { expiresIn: ttlSeconds });
}

export async function headObject(key: string): Promise<{ contentType: string; sizeBytes: number }> {
    const result = await getClient().send(
        new HeadObjectCommand({ Bucket: getBucketName(), Key: key })
    );
    return {
        contentType: result.ContentType ?? "application/octet-stream",
        sizeBytes: result.ContentLength ?? 0,
    };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
    const result = await getClient().send(
        new GetObjectCommand({ Bucket: getBucketName(), Key: key })
    );
    if (!result.Body) throw new Error("Empty object body from R2.");
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
}

export async function sha256OfObject(key: string): Promise<string> {
    const buf = await getObjectBuffer(key);
    return createHash("sha256").update(buf).digest("hex");
}

export async function deleteObject(key: string): Promise<void> {
    await getClient().send(
        new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })
    );
}
