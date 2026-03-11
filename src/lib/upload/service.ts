import {
    deleteObject,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    type UploadMetadata,
} from "firebase/storage";

import { storage } from "@/lib/firebase/config";

/** Allowed MIME types for each upload category. */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
    "profile-photo": ["image/jpeg", "image/png", "image/webp"],
    document: ["application/pdf"],
    evidence: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
};

/** Max file size per category (bytes). */
const MAX_FILE_SIZE: Record<string, number> = {
    "profile-photo": 2 * 1024 * 1024, // 2 MB
    document: 10 * 1024 * 1024, // 10 MB
    evidence: 10 * 1024 * 1024, // 10 MB
};

export type UploadCategory = keyof typeof ALLOWED_MIME_TYPES;

export type UploadProgress = {
    /** 0-100 */
    percent: number;
    bytesTransferred: number;
    totalBytes: number;
};

export type UploadResult = {
    downloadURL: string;
    storagePath: string;
};

export class UploadValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UploadValidationError";
    }
}

/**
 * Validate a file before upload.
 * Throws `UploadValidationError` on failure.
 */
export function validateFile(file: File, category: UploadCategory): void {
    const allowed = ALLOWED_MIME_TYPES[category];
    if (!allowed) {
        throw new UploadValidationError(`Unknown upload category: ${category}`);
    }

    if (!allowed.includes(file.type)) {
        const readable = allowed.map((t) => t.split("/")[1]).join(", ");
        throw new UploadValidationError(`File type not allowed. Accepted: ${readable}`);
    }

    const maxSize = MAX_FILE_SIZE[category]!;
    if (file.size > maxSize) {
        const mbLimit = (maxSize / (1024 * 1024)).toFixed(0);
        throw new UploadValidationError(`File exceeds the ${mbLimit} MB limit.`);
    }
}

/**
 * Build a deterministic, collision-resistant storage path.
 *
 * Pattern: `uploads/{category}/{userId}/{timestamp}-{sanitizedName}`
 */
function buildStoragePath(
    category: UploadCategory,
    userId: string,
    fileName: string,
): string {
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const timestamp = Date.now();
    return `uploads/${category}/${userId}/${timestamp}-${sanitized}`;
}

/**
 * Upload a file to Firebase Storage with progress tracking.
 *
 * @param file      – The File object to upload.
 * @param category  – Upload category (determines validation & storage path).
 * @param userId    – Authenticated user ID (scopes the file).
 * @param onProgress – Optional progress callback.
 * @returns The download URL and storage path.
 */
export function uploadFile(
    file: File,
    category: UploadCategory,
    userId: string,
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
    validateFile(file, category);

    const storagePath = buildStoragePath(category, userId, file.name);
    const fileRef = ref(storage, storagePath);

    const metadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: {
            userId,
            category,
            originalName: file.name,
        },
    };

    return new Promise<UploadResult>((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, file, metadata);

        task.on(
            "state_changed",
            (snapshot) => {
                onProgress?.({
                    percent: Math.round(
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                    ),
                    bytesTransferred: snapshot.bytesTransferred,
                    totalBytes: snapshot.totalBytes,
                });
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(task.snapshot.ref);
                    resolve({ downloadURL, storagePath });
                } catch (error) {
                    reject(error);
                }
            },
        );
    });
}

/**
 * Delete a file from Firebase Storage by its storage path.
 */
export async function deleteFile(storagePath: string): Promise<void> {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
}
