import { randomUUID } from "node:crypto";

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
import {
    createPresignedUploadUrl,
    deleteObject,
    getBucketName,
    headObject,
    publicUrl,
    sha256OfObject,
} from "@/lib/r2/service";
import UploadIntent from "@/models/core/upload-intent";
import DocumentModel from "@/models/reference/document";

const issueUploadSchema = z.object({
    action: z.literal("issue-upload"),
    category: z.string().min(1),
    fileName: z.string().min(1).max(255),
    contentType: z.string().min(1),
});

const finalizeUploadSchema = z.object({
    action: z.literal("finalize-upload"),
    uploadIntentId: z.string().min(1),
});

const deleteUploadSchema = z.object({
    action: z.literal("delete"),
    storagePath: z.string().min(1),
});

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

function buildStoragePath(category: UploadCategory, userId: string, fileName: string) {
    return `uploads/${category}/${userId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();

        // ── Issue Upload ──────────────────────────────────────────────────
        if (body?.action === "issue-upload") {
            const input = issueUploadSchema.parse(body);

            if (!isUploadCategory(input.category)) {
                return NextResponse.json({ message: "Unsupported upload category." }, { status: 400 });
            }

            await dbConnect();

            const storagePath = buildStoragePath(input.category, user.id, input.fileName);

            const intent = await UploadIntent.create({
                userId: user.id,
                category: input.category,
                originalFileName: input.fileName,
                storagePath,
                expiresAt: new Date(Date.now() + UPLOAD_INTENT_TTL_MINUTES * 60 * 1000),
            });

            const uploadUrl = await createPresignedUploadUrl(
                storagePath,
                input.contentType,
                UPLOAD_INTENT_TTL_MINUTES * 60
            );

            return NextResponse.json(
                {
                    uploadIntentId: intent._id.toString(),
                    storagePath: intent.storagePath,
                    uploadUrl,
                    expiresAt: intent.expiresAt.toISOString(),
                },
                { status: 201 }
            );
        }

        // ── Finalize Upload ───────────────────────────────────────────────
        if (body?.action === "finalize-upload") {
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

            // Verify the object actually landed in R2 and check metadata.
            const meta = await headObject(intent.storagePath);
            validateUploadMetadata(intent.category, meta.contentType, meta.sizeBytes);

            // Compute SHA-256 server-side.
            const checksumSha256 = await sha256OfObject(intent.storagePath);
            const fileUrl = publicUrl(intent.storagePath);

            const document = await DocumentModel.create({
                fileName: intent.originalFileName,
                fileUrl,
                fileType: meta.contentType,
                mimeType: meta.contentType,
                sizeBytes: meta.sizeBytes,
                storagePath: intent.storagePath,
                bucketName: getBucketName(),
                checksumSha256,
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
        }

        // ── Delete ────────────────────────────────────────────────────────
        if (body?.action === "delete") {
            const input = deleteUploadSchema.parse(body);

            await dbConnect();

            const document = await DocumentModel.findOne({ storagePath: input.storagePath });
            if (!document) {
                return NextResponse.json({ message: "Document not found." }, { status: 404 });
            }
            if (document.uploadedBy?.toString() !== user.id && user.role !== "Admin") {
                return NextResponse.json({ message: "Not authorized to delete this document." }, { status: 403 });
            }

            await deleteObject(input.storagePath);
            await DocumentModel.deleteOne({ _id: document._id });

            return NextResponse.json({ message: "Document deleted." });
        }

        return NextResponse.json({ message: "Unknown action." }, { status: 400 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
