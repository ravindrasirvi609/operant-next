"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson, toErrorMessage } from "@/lib/http/request-json";

/**
 * Debounced draft autosave with an explicit save escape hatch.
 *
 * PBAS, AQAR, and CAS each carried the same 1.2s-debounce effect. Three
 * problems came with every copy:
 *
 *   1. **Silent failure.** A failed PUT ran `setAutoSaveState("idle")` and said
 *      nothing, so "Auto save: idle" was indistinguishable from "not yet dirty"
 *      — a faculty member could lose a section and never know.
 *   2. **No way to force a save.** The only trigger was the timer, so clicking
 *      Submit within 1.2s of the last keystroke submitted stale data.
 *   3. **No navigation guard.** Closing the tab mid-debounce dropped the edit.
 *
 * This hook reports a real `status`, exposes `save()` for the Submit path to
 * await, and pairs with `useUnsavedChangesWarning` below.
 */

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type UseAutosaveDraftOptions<TValues, TRecord> = {
    /** Item endpoint, e.g. `/api/pbas/${id}`. Null disables autosave entirely. */
    url: string | null;
    /** Validated payload, or null while the form does not parse. */
    values: TValues | null;
    /** Autosave only runs when the user has actually edited something. */
    isDirty: boolean;
    /** False for non-editable statuses (Submitted, Approved, …). */
    enabled: boolean;
    /** Key in the response envelope, e.g. "application". */
    recordKey: string;
    onSaved?: (record: TRecord) => void;
    debounceMs?: number;
};

export type AutosaveDraft = {
    status: AutosaveStatus;
    error: string | null;
    /** True while there are unpersisted edits — drives the navigation guard. */
    hasUnsavedChanges: boolean;
    /** Flush now. Await before submitting so the server sees the latest values. */
    save: () => Promise<boolean>;
};

export function useAutosaveDraft<TValues, TRecord>({
    url,
    values,
    isDirty,
    enabled,
    recordKey,
    onSaved,
    debounceMs = 1200,
}: UseAutosaveDraftOptions<TValues, TRecord>): AutosaveDraft {
    const [status, setStatus] = useState<AutosaveStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    // Everything the save closure needs, read at call time rather than captured
    // — otherwise `save()` from a click handler could send a stale payload.
    const latest = useRef({ url, values, recordKey, onSaved });
    latest.current = { url, values, recordKey, onSaved };

    // Serial number of the last payload we successfully persisted, so
    // `hasUnsavedChanges` is accurate even while a save is in flight.
    const runRef = useRef(0);
    const active = enabled && Boolean(url);

    const save = useCallback(async (): Promise<boolean> => {
        const { url: target, values: payload, recordKey: key, onSaved: notify } = latest.current;

        if (!target || payload === null) {
            return false;
        }

        const run = ++runRef.current;
        setStatus("saving");
        setError(null);

        try {
            const envelope = await requestJson<Record<string, unknown>>(target, {
                method: "PUT",
                body: payload,
                fallbackMessage: "Unable to save your draft.",
            });

            // A newer save started while this one was in flight; let it own the
            // final status so we do not flash "saved" over a pending edit.
            if (run !== runRef.current) {
                return true;
            }

            const record = envelope[key] as TRecord | undefined;
            if (record) {
                notify?.(record);
            }

            setStatus("saved");
            return true;
        } catch (cause) {
            if (run !== runRef.current) {
                return false;
            }

            setStatus("error");
            setError(toErrorMessage(cause, "Unable to save your draft."));
            return false;
        }
    }, []);

    // Mark dirty immediately so the indicator reacts to typing rather than
    // waiting out the debounce and looking frozen.
    useEffect(() => {
        if (!active || !isDirty) {
            return;
        }

        setStatus((current) => (current === "saving" ? current : "dirty"));
    }, [active, isDirty, values]);

    useEffect(() => {
        if (!active || !isDirty || values === null) {
            return;
        }

        const timer = window.setTimeout(() => {
            void save();
        }, debounceMs);

        return () => window.clearTimeout(timer);
    }, [active, isDirty, values, debounceMs, save]);

    // A record switch must not carry the previous record's badge over.
    useEffect(() => {
        setStatus("idle");
        setError(null);
    }, [url]);

    return {
        status,
        error,
        hasUnsavedChanges: active && isDirty && status !== "saved",
        save,
    };
}

/**
 * Browser-level guard for in-flight edits. Deliberately only `beforeunload`:
 * intercepting Next's client-side router would need a router-event API that the
 * App Router does not expose, and a half-working guard is worse than an honest
 * one. In-app navigation is instead handled by the workspace asking for
 * confirmation before leaving a dirty wizard.
 */
export function useUnsavedChangesWarning(when: boolean) {
    useEffect(() => {
        if (!when) {
            return;
        }

        function handler(event: BeforeUnloadEvent) {
            event.preventDefault();
            // Legacy browsers require a truthy returnValue to show the prompt.
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [when]);
}
