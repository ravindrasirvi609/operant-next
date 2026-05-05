export const ALLOWED_MIME_TYPES = {
    "profile-photo": ["image/jpeg", "image/png", "image/webp"],
    document: ["application/pdf"],
    evidence: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
} as const;

export const MAX_FILE_SIZE = {
    "profile-photo": 2 * 1024 * 1024,
    document: 10 * 1024 * 1024,
    evidence: 10 * 1024 * 1024,
} as const;

export const UPLOAD_INTENT_TTL_MINUTES = 15;

export type UploadCategory = keyof typeof ALLOWED_MIME_TYPES;

export function isUploadCategory(value: string): value is UploadCategory {
    return value in ALLOWED_MIME_TYPES;
}

export function validateUploadMetadata(
    category: UploadCategory,
    fileType: string,
    sizeBytes: number
) {
    const allowed = ALLOWED_MIME_TYPES[category] as readonly string[];
    if (!allowed.includes(fileType)) {
        throw new Error("Uploaded file type is not allowed for this category.");
    }

    const maxSize = MAX_FILE_SIZE[category];
    if (sizeBytes > maxSize) {
        throw new Error("Uploaded file exceeds the allowed size.");
    }
}
