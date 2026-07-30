"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability.client";

/**
 * Global error boundary — the last line of defence.
 *
 * This boundary replaces the **root layout** when the layout itself throws, so
 * it must render its own `<html>`/`<body>`. Crucially, `globals.css` is NOT
 * loaded in this state, so styling is done with inline styles only (Tailwind
 * classes would be unstyled here).
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, { boundary: "global" });
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    background: "#f8fafc",
                    color: "#1f2937",
                }}
            >
                <div style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
                    <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>Something went wrong</h1>
                    <p style={{ fontSize: 16, lineHeight: 1.6, margin: "0 0 24px", color: "#6b7280" }}>
                        A critical error prevented the application from loading. Please try again. If
                        the problem continues, contact your administrator.
                    </p>
                    {error.digest ? (
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 24px" }}>
                            Reference: {error.digest}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            background: "#111827",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px 22px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
