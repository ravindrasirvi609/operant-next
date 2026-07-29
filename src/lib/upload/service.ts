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
    uploadUrl: string;
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
    contentType: string,
): Promise<UploadIntentResponse> {
    const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue-upload", category, fileName, contentType }),
    });

    const data = (await response.json()) as UploadIntentResponse & { message?: string };
    if (!response.ok || !data.uploadIntentId || !data.uploadUrl) {
        throw new Error(data.message ?? "Unable to prepare file upload.");
    }

    return data;
}

function putToR2(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress({
                        percent: Math.round((event.loaded / event.total) * 100),
                        bytesTransferred: event.loaded,
                        totalBytes: event.total,
                    });
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`R2 upload failed with status ${xhr.status}.`));
            }
        };

        xhr.onerror = () => reject(new Error("Network error during file upload."));
        xhr.onabort = () => reject(new Error("File upload was aborted."));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
    });
}

export async function uploadFile(
    file: File,
    category: UploadCategory,
    _userId: string,
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
    validateFile(file, category);

    const intent = await requestUploadIntent(category, file.name, file.type);

    await putToR2(file, intent.uploadUrl, onProgress);

    const r2PublicBase = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    const downloadURL = r2PublicBase
        ? `${r2PublicBase.replace(/\/$/, "")}/${intent.storagePath}`
        : intent.storagePath;

    return {
        downloadURL,
        storagePath: intent.storagePath,
        uploadIntentId: intent.uploadIntentId,
    };
}

export async function registerUploadedDocument(uploadResult: UploadResult): Promise<UploadedDocument> {
    const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "finalize-upload",
            uploadIntentId: uploadResult.uploadIntentId,
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
    const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", storagePath }),
    });

    if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to delete file.");
    }
}
