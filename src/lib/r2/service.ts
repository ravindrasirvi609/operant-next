import { createHash } from "node:crypto";

import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getClient } from "@/lib/r2/client";

export function getBucketName(): string {
    const name = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!name) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME environment variable.");
    return name;
}

export function publicUrl(key: string): string {
    const base = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (!base) throw new Error("Missing CLOUDFLARE_R2_PUBLIC_URL environment variable.");
    return `${base.replace(/\/$/, "")}/${key}`;
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
