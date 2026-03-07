"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/auth/auth-helpers";

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
        <Button variant="secondary" onClick={handleLogout} disabled={isPending}>
            {isPending ? <Spinner /> : null}
            Logout
        </Button>
    );
}
