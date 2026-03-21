"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
            <Alert variant="destructive">
                <AlertTitle>Unable to load faculty workspace</AlertTitle>
                <AlertDescription>
                    {error.message ?? "Please try again. If the issue continues, contact your administrator."}
                </AlertDescription>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={reset}>
                        Try again
                    </Button>
                </div>
            </Alert>
        </main>
    );
}

