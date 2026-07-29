"use client";

import { useState } from "react";

import { AvatarUpload } from "@/components/ui/file-upload";

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
    const [photoURL, setPhotoURL] = useState(currentPhotoURL ?? "");

    async function handleChange(url: string | null) {
        const next = url ?? "";
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photoURL: next }),
            });
            if (!res.ok) {
                const data = (await res.json()) as { message?: string };
                throw new Error(data.message ?? "Failed to save photo.");
            }
            setPhotoURL(next);
        } catch {
            // The AvatarUpload component already shows a toast on upload errors;
            // this handles the persistence-route error.
        }
    }

    return (
        <AvatarUpload
            ownerId={userId}
            value={photoURL || null}
            onChange={(url) => void handleChange(url)}
        />
    );
}
