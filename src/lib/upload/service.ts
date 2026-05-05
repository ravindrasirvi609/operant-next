import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytesResumable,
    type UploadMetadata,
} from "firebase/storage";

import { storage } from "@/lib/firebase/config";
import {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    type UploadCategory,
} from "@/lib/upload/policy";

export type UploadProgress = {
    percent: number;
    bytesTransferred: number;
    totalBytes: number;
};

export type UploadResult = {
    downloadURL: string;
    storagePath: string;
    uploadIntentId: string;
};

export type UploadedDocument = {
    _id: string;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    mimeType?: string;
    sizeBytes?: number;
    storagePath?: string;
    checksumSha256?: string;
    checksumAlgorithm?: string;
    verificationStatus?: string;
};

type UploadIntentResponse = {
    uploadIntentId: string;
    storagePath: string;
    expiresAt: string;
};

export class UploadValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UploadValidationError";
    }
}

export function validateFile(file: File, category: UploadCategory): void {
    const allowed = ALLOWED_MIME_TYPES[category] as readonly string[];
    if (!allowed.includes(file.type)) {
        const readable = allowed.map((type) => type.split("/")[1]).join(", ");
        throw new UploadValidationError(`File type not allowed. Accepted: ${readable}`);
    }

    const maxSize = MAX_FILE_SIZE[category];
    if (file.size > maxSize) {
        const mbLimit = (maxSize / (1024 * 1024)).toFixed(0);
        throw new UploadValidationError(`File exceeds the ${mbLimit} MB limit.`);
    }
}

async function requestUploadIntent(
    category: UploadCategory,
    fileName: string,
): Promise<UploadIntentResponse> {
    const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action: "issue-upload",
            category,
            fileName,
        }),
    });

    const data = (await response.json()) as UploadIntentResponse & { message?: string };
    if (!response.ok || !data.uploadIntentId || !data.storagePath) {
        throw new Error(data.message ?? "Unable to prepare file upload.");
    }

    return data;
}

export function uploadFile(
    file: File,
    category: UploadCategory,
    userId: string,
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
        void (async () => {
            validateFile(file, category);

            const intent = await requestUploadIntent(category, file.name);
            const fileRef = ref(storage, intent.storagePath);

            const metadata: UploadMetadata = {
                contentType: file.type,
                customMetadata: {
                    category,
                    originalName: file.name,
                    requestedByUserId: userId,
                    uploadIntentId: intent.uploadIntentId,
                },
            };

            const task = uploadBytesResumable(fileRef, file, metadata);

            task.on(
                "state_changed",
                (snapshot) => {
                    onProgress?.({
                        percent: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
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
                        resolve({
                            downloadURL,
                            storagePath: intent.storagePath,
                            uploadIntentId: intent.uploadIntentId,
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
            );
        })().catch(reject);
    });
}

export async function registerUploadedDocument(uploadResult: UploadResult): Promise<UploadedDocument> {
    const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action: "finalize-upload",
            uploadIntentId: uploadResult.uploadIntentId,
            downloadURL: uploadResult.downloadURL,
        }),
    });

    const data = (await response.json()) as {
        document?: UploadedDocument;
        message?: string;
    };

    if (!response.ok || !data.document?._id) {
        throw new Error(data.message ?? "Unable to save uploaded document.");
    }

    return data.document;
}

export async function deleteFile(storagePath: string): Promise<void> {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
}
