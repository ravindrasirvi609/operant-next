import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import dbConnect from "@/lib/dbConnect";
import {
    UPLOAD_INTENT_TTL_MINUTES,
    isUploadCategory,
    type UploadCategory,
    validateUploadMetadata,
} from "@/lib/upload/policy";
import UploadIntent from "@/models/core/upload-intent";
import DocumentModel from "@/models/reference/document";

const issueUploadSchema = z.object({
    action: z.literal("issue-upload"),
    category: z.string().min(1),
    fileName: z.string().min(1).max(255),
});

const finalizeUploadSchema = z.object({
    action: z.literal("finalize-upload"),
    uploadIntentId: z.string().min(1),
    downloadURL: z.string().url(),
});

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

function buildStoragePath(category: UploadCategory, userId: string, fileName: string) {
    return `uploads/${category}/${userId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

function getRequiredBucketName() {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error("Missing Firebase storage bucket configuration.");
    }

    return bucketName;
}

function parseFirebaseDownloadUrl(downloadURL: string) {
    const url = new URL(downloadURL);
    const bucketName = getRequiredBucketName();

    if (url.hostname !== "firebasestorage.googleapis.com") {
        throw new Error("Only Firebase Storage download URLs are allowed.");
    }

    const pathMatch = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!pathMatch) {
        throw new Error("Invalid Firebase Storage object URL.");
    }

    const parsedBucketName = decodeURIComponent(pathMatch[1] ?? "");
    if (parsedBucketName !== bucketName) {
        throw new Error("Upload bucket mismatch.");
    }

    const storagePath = decodeURIComponent(pathMatch[2] ?? "");
    if (!storagePath) {
        throw new Error("Uploaded object path is missing.");
    }

    return {
        bucketName,
        storagePath,
    };
}

async function fetchUploadedFileMetadata(downloadURL: string) {
    const response = await fetch(downloadURL, {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Unable to verify the uploaded file.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
        mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream",
        sizeBytes: buffer.byteLength,
        checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    };
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();

        if (body?.action === "issue-upload") {
            const input = issueUploadSchema.parse(body);

            if (!isUploadCategory(input.category)) {
                return NextResponse.json({ message: "Unsupported upload category." }, { status: 400 });
            }

            await dbConnect();

            const intent = await UploadIntent.create({
                userId: user.id,
                category: input.category,
                originalFileName: input.fileName,
                storagePath: buildStoragePath(input.category, user.id, input.fileName),
                expiresAt: new Date(Date.now() + UPLOAD_INTENT_TTL_MINUTES * 60 * 1000),
            });

            return NextResponse.json(
                {
                    uploadIntentId: intent._id.toString(),
                    storagePath: intent.storagePath,
                    expiresAt: intent.expiresAt.toISOString(),
                },
                { status: 201 }
            );
        }

        await dbConnect();

        const input = finalizeUploadSchema.parse(body);
        const intent = await UploadIntent.findById(input.uploadIntentId);

        if (!intent || intent.userId.toString() !== user.id) {
            return NextResponse.json({ message: "Upload intent not found." }, { status: 404 });
        }

        if (intent.completedAt) {
            return NextResponse.json({ message: "Upload intent has already been finalized." }, { status: 409 });
        }

        if (intent.expiresAt.getTime() <= Date.now()) {
            return NextResponse.json({ message: "Upload intent has expired." }, { status: 410 });
        }

        const parsedUpload = parseFirebaseDownloadUrl(input.downloadURL);
        if (parsedUpload.storagePath !== intent.storagePath) {
            return NextResponse.json(
                { message: "Uploaded file path does not match the issued upload intent." },
                { status: 400 }
            );
        }

        const fileMetadata = await fetchUploadedFileMetadata(input.downloadURL);
        validateUploadMetadata(intent.category, fileMetadata.mimeType, fileMetadata.sizeBytes);

        const document = await DocumentModel.create({
            fileName: intent.originalFileName,
            fileUrl: input.downloadURL,
            fileType: fileMetadata.mimeType,
            mimeType: fileMetadata.mimeType,
            sizeBytes: fileMetadata.sizeBytes,
            storagePath: intent.storagePath,
            bucketName: parsedUpload.bucketName,
            checksumSha256: fileMetadata.checksumSha256,
            checksumAlgorithm: "SHA-256",
            uploadCategory: intent.category,
            uploadIntentId: intent._id,
            uploadedBy: user.id,
            uploadedAt: new Date(),
            verificationStatus: "Pending",
            verified: false,
        });

        intent.completedAt = new Date();
        intent.documentId = document._id;
        await intent.save();

        return NextResponse.json({ document }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
