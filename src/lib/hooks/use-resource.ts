"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson, toErrorMessage } from "@/lib/http/request-json";

/**
 * Cancel-safe GET for a single dependent resource.
 *
 * Replaces six copies of this exact effect body across the accreditation
 * modules (PBAS detail, PBAS entries, CAS documents, CAS workflow, and their
 * error/loading twins):
 *
 *   useEffect(() => {
 *     if (!selectedId) { setThing(null); return; }
 *     let cancelled = false;
 *     setLoading(true); setError(null);
 *     fetch(url).then((r) => r.json()).then((data) => {
 *       if (cancelled) return;
 *       if (!data?.thing) { setError("Unable to load ..."); setLoading(false); return; }
 *       setThing(data.thing); setLoading(false);
 *     }).catch(() => { if (cancelled) return; setError("Unable to load ..."); setLoading(false); });
 *     return () => { cancelled = true; };
 *   }, [selectedId]);
 *
 * Two bugs are fixed in the process. The `cancelled` flag in the original only
 * guards against unmount — a fast re-select still let an in-flight response for
 * record A land in state while record B was selected. Here every run gets a
 * monotonic token and only the newest one may write. And `select` runs on the
 * parsed payload, so a 200 with a missing key is an error rather than
 * `undefined` silently flowing into the UI.
 */

export type Resource<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
    /** Refetch now. Safe to call from an event handler. */
    reload: () => void;
    /** Local write-through, for optimistic updates that mirror a PUT response. */
    setData: (next: T | null) => void;
};

export type UseResourceOptions<TPayload, T> = {
    /** Pass null/undefined to stay idle — used when nothing is selected yet. */
    url: string | null | undefined;
    /** Pull the value out of the response envelope, e.g. `(d) => d.application`. */
    select: (payload: TPayload) => T | null | undefined;
    /** Shown when the request fails or `select` yields nothing. */
    errorMessage: string;
    /** Skip fetching without unmounting, e.g. while a dialog is closed. */
    enabled?: boolean;
};

export function useResource<TPayload, T>({
    url,
    select,
    errorMessage,
    enabled = true,
}: UseResourceOptions<TPayload, T>): Resource<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    // Newest-run-wins. A plain boolean cannot express "an older request just
    // resolved", which is what produced cross-record state bleed before.
    const runRef = useRef(0);
    // `select` is almost always an inline arrow, so it is a new identity every
    // render; keeping it in a ref stops it from re-triggering the effect.
    const selectRef = useRef(select);
    selectRef.current = select;

    const active = Boolean(url) && enabled;

    useEffect(() => {
        if (!active || !url) {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }

        const run = ++runRef.current;
        setLoading(true);
        setError(null);

        void requestJson<TPayload>(url, { fallbackMessage: errorMessage })
            .then((payload) => {
                if (run !== runRef.current) return;

                const value = selectRef.current(payload);
                if (value === null || value === undefined) {
                    setData(null);
                    setError(errorMessage);
                } else {
                    setData(value);
                }
            })
            .catch((cause: unknown) => {
                if (run !== runRef.current) return;
                setData(null);
                setError(toErrorMessage(cause, errorMessage));
            })
            .finally(() => {
                if (run !== runRef.current) return;
                setLoading(false);
            });
    }, [url, active, errorMessage, nonce]);

    const reload = useCallback(() => setNonce((value) => value + 1), []);

    return { data, loading, error, reload, setData };
}
