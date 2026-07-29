"use client";

import {
    CheckCircle2,
    Clock,
    FileText,
    ImageIcon,
    Loader2,
    Trash2,
    Upload,
    UserCircle2,
    XCircle,
} from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    registerUploadedDocument,
    uploadFile,
    validateFile,
    UploadValidationError,
    type UploadedDocument,
    type UploadProgress,
} from "@/lib/upload/service";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type UploadCategory } from "@/lib/upload/policy";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanAccept(category: UploadCategory): string {
    const types = ALLOWED_MIME_TYPES[category] as readonly string[];
    return types.map((t) => t.split("/")[1]?.toUpperCase() ?? t).join(", ");
}

function acceptAttr(category: UploadCategory): string {
    return (ALLOWED_MIME_TYPES[category] as readonly string[]).join(",");
}

function maxSizeLabel(category: UploadCategory): string {
    return `${(MAX_FILE_SIZE[category] / (1024 * 1024)).toFixed(0)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status?: string }) {
    if (!status) return null;
    const variants: Record<string, string> = {
        Verified: "bg-emerald-100 text-emerald-700",
        Rejected: "bg-red-100 text-red-700",
        Pending: "bg-amber-100 text-amber-700",
    };
    const icons: Record<string, React.ReactNode> = {
        Verified: <CheckCircle2 className="size-3" />,
        Rejected: <XCircle className="size-3" />,
        Pending: <Clock className="size-3" />,
    };
    return (
        <Badge
            variant="secondary"
            className={cn("inline-flex items-center gap-1 text-xs", variants[status] ?? "bg-zinc-100 text-zinc-600")}
        >
            {icons[status]}
            {status}
        </Badge>
    );
}

function ProgressBar({ percent }: { percent: number }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
                className="h-full rounded-full bg-sky-500 transition-all duration-200"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

// ─── Single-file upload: "dropzone" variant ───────────────────────────────────

type FileUploadProps = {
    category: UploadCategory;
    ownerId: string;
    /** Current value. A string means a bare URL (mode="url"); an object means a saved Document (mode="document"). */
    value?: UploadedDocument | string | null;
    onChange?: (value: UploadedDocument | string | null) => void;
    /** "url" stores the raw public URL in onChange; "document" registers via /api/documents and returns the full Document. */
    mode?: "url" | "document";
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
};

export function FileUpload({
    category,
    ownerId,
    value,
    onChange,
    mode = "document",
    label,
    description,
    disabled = false,
    className,
}: FileUploadProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const currentUrl =
        typeof value === "string" ? value : (value as UploadedDocument)?.fileUrl ?? null;
    const currentDoc = typeof value === "object" && value !== null ? (value as UploadedDocument) : null;
    const isImage = currentUrl && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(currentUrl);
    const isPdf = currentDoc?.mimeType === "application/pdf" || (!isImage && !!currentUrl);

    async function handleFile(file: File) {
        if (disabled || loading) return;
        setError(null);
        try {
            validateFile(file, category);
        } catch (err) {
            if (err instanceof UploadValidationError) setError(err.message);
            return;
        }

        setLoading(true);
        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });

        try {
            const result = await uploadFile(file, category, ownerId, (p) => setProgress(p));

            if (mode === "document") {
                const doc = await registerUploadedDocument(result);
                onChange?.(doc);
            } else {
                onChange?.(result.downloadURL);
            }
            setProgress(null);
        } catch (err) {
            setProgress(null);
            const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void handleFile(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
    }

    function handleRemove() {
        onChange?.(null);
        setError(null);
    }

    return (
        <div className={cn("grid gap-2", className)}>
            {label && (
                <p className="text-sm font-medium text-zinc-800">{label}</p>
            )}

            {/* Drop zone */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={label ?? "Upload file"}
                onClick={() => !disabled && !loading && inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors",
                    dragging ? "border-sky-400 bg-sky-50" : "border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50",
                    disabled && "cursor-not-allowed opacity-60",
                    currentUrl && "border-solid border-zinc-200 bg-white",
                )}
            >
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept={acceptAttr(category)}
                    className="sr-only"
                    onChange={handleInputChange}
                    disabled={disabled || loading}
                />

                {/* Existing file preview */}
                {currentUrl ? (
                    <div className="flex w-full items-start gap-3">
                        {isImage ? (
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                                <Image src={currentUrl} alt="Preview" fill className="object-cover" sizes="48px" unoptimized />
                            </div>
                        ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100">
                                {isPdf ? (
                                    <FileText className="size-6 text-zinc-500" />
                                ) : (
                                    <FileText className="size-6 text-zinc-500" />
                                )}
                            </div>
                        )}

                        <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium text-zinc-900">
                                {currentDoc?.fileName ?? "Uploaded file"}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                {currentDoc?.sizeBytes ? (
                                    <span className="text-xs text-zinc-500">{formatBytes(currentDoc.sizeBytes)}</span>
                                ) : null}
                                <VerificationBadge status={currentDoc?.verificationStatus} />
                                <a
                                    href={currentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs font-medium text-sky-600 hover:underline"
                                >
                                    Open ↗
                                </a>
                            </div>
                        </div>

                        {!disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                aria-label="Remove file"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    /* Empty state */
                    <>
                        {loading ? (
                            <Loader2 className="size-6 animate-spin text-sky-500" />
                        ) : (
                            <Upload className="size-6 text-zinc-400" />
                        )}
                        <p className="text-center text-sm text-zinc-600">
                            {loading ? "Uploading…" : "Drop file here or click to browse"}
                        </p>
                        <p className="text-xs text-zinc-400">
                            {humanAccept(category)} — max {maxSizeLabel(category)}
                        </p>
                    </>
                )}

                {/* Progress bar overlay */}
                {progress && (
                    <div className="w-full">
                        <ProgressBar percent={progress.percent} />
                        <p className="mt-1 text-center text-xs text-zinc-500">
                            {progress.percent}% — {formatBytes(progress.bytesTransferred)} / {formatBytes(progress.totalBytes)}
                        </p>
                    </div>
                )}
            </div>

            {description && !error && (
                <p className="text-xs text-zinc-500">{description}</p>
            )}
            {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
    );
}

// ─── Avatar variant (profile photo) ──────────────────────────────────────────

type AvatarUploadProps = {
    ownerId: string;
    value?: string | null;
    onChange?: (url: string | null) => void;
    disabled?: boolean;
    label?: string;
    hint?: string;
};

export function AvatarUpload({
    ownerId,
    value,
    onChange,
    disabled = false,
    label = "Upload Photo",
    hint = "JPG, PNG, or WebP — max 2 MB",
}: AvatarUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleFile(file: File) {
        if (disabled || loading) return;
        setError(null);
        try {
            validateFile(file, "profile-photo");
        } catch (err) {
            if (err instanceof UploadValidationError) setError(err.message);
            return;
        }

        setLoading(true);
        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });
        try {
            const result = await uploadFile(file, "profile-photo", ownerId, (p) => setProgress(p));
            onChange?.(result.downloadURL);
            setProgress(null);
        } catch (err) {
            setProgress(null);
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex w-full max-w-[210px] flex-col items-center gap-3">
            {/* Avatar circle */}
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
                {value ? (
                    <Image src={value} alt="Profile photo" fill className="object-cover" sizes="112px" unoptimized />
                ) : (
                    <div className="flex size-full items-center justify-center text-zinc-400">
                        <UserCircle2 className="size-10" />
                    </div>
                )}
                {progress && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white">
                        {progress.percent}%
                    </div>
                )}
            </div>

            <div className="grid w-full gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleFile(f);
                    }}
                    disabled={disabled || loading}
                />

                <div className="flex justify-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled || loading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                        {value ? "Change Photo" : label}
                    </Button>
                    {value && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                            disabled={disabled || loading}
                            onClick={() => { onChange?.(null); setError(null); }}
                            aria-label="Remove photo"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                <p className="text-center text-xs text-zinc-500">{hint}</p>
                {error && <p className="text-center text-sm text-rose-700">{error}</p>}
            </div>
        </div>
    );
}

// ─── Multi-file upload ─────────────────────────────────────────────────────────

type MultiFileUploadProps = {
    category: UploadCategory;
    ownerId: string;
    value?: UploadedDocument[];
    onChange?: (docs: UploadedDocument[]) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
    maxFiles?: number;
};

export function MultiFileUpload({
    category,
    ownerId,
    value = [],
    onChange,
    label,
    description,
    disabled = false,
    className,
    maxFiles = 10,
}: MultiFileUploadProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleFile(file: File) {
        if (disabled || loading || value.length >= maxFiles) return;
        setError(null);
        try {
            validateFile(file, category);
        } catch (err) {
            if (err instanceof UploadValidationError) setError(err.message);
            return;
        }

        setLoading(true);
        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });
        try {
            const result = await uploadFile(file, category, ownerId, (p) => setProgress(p));
            const doc = await registerUploadedDocument(result);
            onChange?.([...value, doc]);
            setProgress(null);
        } catch (err) {
            setProgress(null);
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    function removeDoc(index: number) {
        onChange?.(value.filter((_, i) => i !== index));
    }

    return (
        <div className={cn("grid gap-2", className)}>
            {label && <p className="text-sm font-medium text-zinc-800">{label}</p>}

            {/* Existing files */}
            {value.length > 0 && (
                <div className="grid gap-1.5">
                    {value.map((doc, i) => (
                        <div
                            key={doc._id}
                            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                        >
                            <FileText className="size-4 shrink-0 text-zinc-400" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-zinc-800">{doc.fileName}</p>
                                <div className="flex items-center gap-2">
                                    {doc.sizeBytes ? (
                                        <span className="text-xs text-zinc-400">{formatBytes(doc.sizeBytes)}</span>
                                    ) : null}
                                    <VerificationBadge status={doc.verificationStatus} />
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-medium text-sky-600 hover:underline"
                                    >
                                        Open ↗
                                    </a>
                                </div>
                            </div>
                            {!disabled && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                                    onClick={() => removeDoc(i)}
                                    aria-label="Remove file"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add more */}
            {value.length < maxFiles && (
                <button
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-2.5 text-sm text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50",
                        (disabled || loading) && "cursor-not-allowed opacity-60"
                    )}
                >
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        accept={acceptAttr(category)}
                        className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleFile(f); }}
                        disabled={disabled || loading}
                    />
                    {loading ? <Loader2 className="size-4 animate-spin text-sky-500" /> : <Upload className="size-4 text-zinc-400" />}
                    {loading ? `Uploading ${progress?.percent ?? 0}%…` : `Add file (${value.length}/${maxFiles})`}
                </button>
            )}

            {progress && loading && (
                <ProgressBar percent={progress.percent} />
            )}

            {description && !error && <p className="text-xs text-zinc-500">{description}</p>}
            {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
    );
}

// ─── Inline upload (compact, used inside tables/forms) ────────────────────────

type InlineUploadProps = {
    category: UploadCategory;
    ownerId: string;
    value?: UploadedDocument | string | null;
    onChange?: (value: UploadedDocument | string | null) => void;
    mode?: "url" | "document";
    disabled?: boolean;
    placeholder?: string;
    accept?: string;
};

export function InlineUpload({
    category,
    ownerId,
    value,
    onChange,
    mode = "document",
    disabled = false,
    placeholder = "Upload file",
}: InlineUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const currentUrl =
        typeof value === "string" ? value : (value as UploadedDocument)?.fileUrl ?? null;
    const currentDoc = typeof value === "object" && value !== null ? (value as UploadedDocument) : null;

    async function handleFile(file: File) {
        if (disabled || loading) return;
        setError(null);
        try { validateFile(file, category); }
        catch (err) { if (err instanceof UploadValidationError) { setError(err.message); } return; }

        setLoading(true);
        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });
        try {
            const result = await uploadFile(file, category, ownerId, (p) => setProgress(p));
            if (mode === "document") {
                const doc = await registerUploadedDocument(result);
                onChange?.(doc);
            } else {
                onChange?.(result.downloadURL);
            }
            setProgress(null);
        } catch (err) {
            setProgress(null);
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setError(msg);
            toast.error(msg);
        } finally { setLoading(false); }
    }

    if (currentUrl) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline"
                >
                    <FileText className="size-3.5" />
                    {currentDoc?.fileName ?? "View file"}
                </a>
                <VerificationBadge status={currentDoc?.verificationStatus} />
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => { onChange?.(null); setError(null); }}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500"
                        aria-label="Remove"
                    >
                        <Trash2 className="size-3" /> Remove
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                ref={inputRef}
                type="file"
                accept={acceptAttr(category)}
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleFile(f); }}
                disabled={disabled || loading}
            />
            <label
                onClick={() => !disabled && !loading && inputRef.current?.click()}
                className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50",
                    (disabled || loading) && "cursor-not-allowed opacity-60"
                )}
            >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {loading ? `${progress?.percent ?? 0}%` : placeholder}
            </label>
            {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
    );
}
