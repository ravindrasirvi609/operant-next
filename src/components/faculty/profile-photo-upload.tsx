"use client";

import { Camera, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import {
    uploadFile,
    validateFile,
    UploadValidationError,
    type UploadProgress,
} from "@/lib/upload/service";

type Props = {
    userId: string;
    currentPhotoURL?: string;
    endpoint?: string;
};

export function ProfilePhotoUpload({
    userId,
    currentPhotoURL,
    endpoint = "/api/faculty/photo",
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [photoURL, setPhotoURL] = useState(currentPhotoURL ?? "");
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        inputRef.current?.click();
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset the input so re-selecting the same file triggers change.
        event.target.value = "";

        setError(null);

        try {
            validateFile(file, "profile-photo");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setError(err.message);
            }
            return;
        }

        startTransition(async () => {
            try {
                const result = await uploadFile(
                    file,
                    "profile-photo",
                    userId,
                    setProgress,
                );

                // Persist the URL in the database.
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ photoURL: result.downloadURL }),
                });

                if (!response.ok) {
                    const data = (await response.json()) as { message?: string };
                    throw new Error(data.message ?? "Failed to save photo.");
                }

                setPhotoURL(result.downloadURL);
                setProgress(null);
            } catch (err) {
                setProgress(null);
                setError(
                    err instanceof Error ? err.message : "Upload failed. Please try again.",
                );
            }
        });
    }

    function handleRemove() {
        startTransition(async () => {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ photoURL: "" }),
                });

                if (!response.ok) {
                    const data = (await response.json()) as { message?: string };
                    throw new Error(data.message ?? "Failed to remove photo.");
                }

                setPhotoURL("");
                setError(null);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Could not remove photo.",
                );
            }
        });
    }

    return (
        <div className="flex w-full max-w-[210px] flex-col items-center gap-3">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                {photoURL ? (
                    <Image
                        src={photoURL}
                        alt="Profile photo"
                        fill
                        className="object-cover"
                        sizes="112px"
                        unoptimized
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-slate-400">
                        <Camera className="size-9" />
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
                    onChange={handleFileChange}
                />

                <div className="flex justify-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={handleClick}
                    >
                        {isPending ? <Spinner className="mr-1" /> : <Upload className="mr-1 size-4" />}
                        {photoURL ? "Change Photo" : "Upload Photo"}
                    </Button>

                    {photoURL && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isPending}
                            onClick={handleRemove}
                            aria-label="Delete photo"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500">
                    JPG, PNG, or WebP — max 2 MB
                </p>

                {error && (
                    <p className="text-center text-sm text-rose-700">{error}</p>
                )}
            </div>
        </div>
    );
}
