"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleLogout() {
        startTransition(async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        });
    }

    return (
        <Button loading={isPending} variant="secondary" onClick={handleLogout} disabled={isPending}>
            Logout
        </Button>
    );
}
