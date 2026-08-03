"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import type { FeedbackMessage } from "@/components/ui/inline-alert";

/**
 * The master-detail state machine shared by PBAS, AQAR, and CAS.
 *
 * All three carried their own copy of `createDraft` / `submitApplication` /
 * `deleteApplication` plus the `records` / `selectedId` / `message` /
 * `isPending` state around them — four near-identical bodies differing only in
 * the endpoint prefix and the noun in each toast.
 *
 * Two behavioural fixes come with the consolidation:
 *
 *   - **Rollback.** The originals wrote the optimistic list update *before*
 *     awaiting the response and never undid it on failure, so a rejected delete
 *     left the row gone from the UI until a hard refresh. Here every mutation
 *     snapshots the list and restores it if the request throws.
 *   - **Selection safety.** Deleting the selected record left `selectedId`
 *     dangling in CAS/AQAR. `remove` clears it.
 */

export type WorkspaceRecord = { _id: string };

export type RecordWorkspaceLabels = {
    /** Lowercase noun used in fallback messages, e.g. "PBAS application". */
    noun: string;
};

export type UseRecordWorkspaceOptions<T extends WorkspaceRecord> = {
    initialRecords: T[];
    /** Collection endpoint, e.g. "/api/pbas". Item routes derive from it. */
    endpoint: string;
    /** Key in the response envelope holding the record, e.g. "application". */
    recordKey: string;
    labels: RecordWorkspaceLabels;
    /** Preselect the first record (list-first modules pass false). */
    autoSelectFirst?: boolean;
};

export type RecordWorkspace<T extends WorkspaceRecord> = {
    records: T[];
    selectedId: string | null;
    selected: T | undefined;
    message: FeedbackMessage | null;
    isPending: boolean;
    setMessage: (message: FeedbackMessage | null) => void;
    select: (id: string | null) => void;
    /** Write-through for autosave / reference-toggle responses. */
    upsert: (record: T) => void;
    create: (payload: unknown) => Promise<T | null>;
    submit: (id: string) => Promise<T | null>;
    remove: (id: string) => Promise<boolean>;
};

type Envelope = Record<string, unknown> & { message?: string };

export function useRecordWorkspace<T extends WorkspaceRecord>({
    initialRecords,
    endpoint,
    recordKey,
    labels,
    autoSelectFirst = false,
}: UseRecordWorkspaceOptions<T>): RecordWorkspace<T> {
    const [records, setRecords] = useState<T[]>(initialRecords);
    const [selectedId, setSelectedId] = useState<string | null>(
        autoSelectFirst ? initialRecords[0]?._id ?? null : null
    );
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [isPending, startTransition] = useTransition();

    const selected = useMemo(
        () => records.find((item) => item._id === selectedId),
        [records, selectedId]
    );

    const select = useCallback((id: string | null) => {
        setSelectedId(id);
        setMessage(null);
    }, []);

    const upsert = useCallback((record: T) => {
        setRecords((current) => {
            const exists = current.some((item) => item._id === record._id);
            return exists
                ? current.map((item) => (item._id === record._id ? record : item))
                : [record, ...current];
        });
    }, []);

    /**
     * `startTransition` cannot return a value to the caller, but the dashboards
     * need the created record so they can jump straight into its wizard. So the
     * request is awaited in a promise the caller holds, and the transition only
     * wraps the state commit — which is what actually needs to be non-blocking.
     */
    const mutate = useCallback(
        async (
            url: string,
            init: { method: string; body?: unknown },
            fallback: string,
            commit: (record: T) => void
        ): Promise<T | null> => {
            setMessage(null);

            try {
                const payload = await requestJson<Envelope>(url, {
                    method: init.method,
                    body: init.body,
                    fallbackMessage: fallback,
                });

                const record = payload[recordKey] as T | undefined;
                if (!record?._id) {
                    setMessage({ type: "error", text: payload.message ?? fallback });
                    return null;
                }

                startTransition(() => {
                    commit(record);
                    setMessage({ type: "success", text: payload.message ?? "Saved." });
                });

                return record;
            } catch (cause) {
                setMessage({ type: "error", text: toErrorMessage(cause, fallback) });
                return null;
            }
        },
        [recordKey]
    );

    const create = useCallback(
        (payload: unknown) =>
            mutate(
                endpoint,
                { method: "POST", body: payload },
                `Unable to create ${labels.noun}.`,
                (record) => {
                    upsert(record);
                    setSelectedId(record._id);
                }
            ),
        [endpoint, labels.noun, mutate, upsert]
    );

    const submit = useCallback(
        (id: string) =>
            mutate(
                `${endpoint}/${id}/submit`,
                { method: "POST" },
                `Unable to submit ${labels.noun}.`,
                upsert
            ),
        [endpoint, labels.noun, mutate, upsert]
    );

    const remove = useCallback(
        async (id: string): Promise<boolean> => {
            setMessage(null);
            const snapshot = records;
            const wasSelected = selectedId === id;

            // Optimistic, but recoverable — see the rollback in the catch.
            setRecords((current) => current.filter((item) => item._id !== id));
            if (wasSelected) {
                setSelectedId(null);
            }

            try {
                const payload = await requestJson<Envelope>(`${endpoint}/${id}`, {
                    method: "DELETE",
                    fallbackMessage: `Unable to delete ${labels.noun}.`,
                });

                setMessage({ type: "success", text: payload.message ?? `${labels.noun} deleted.` });
                return true;
            } catch (cause) {
                setRecords(snapshot);
                if (wasSelected) {
                    setSelectedId(id);
                }
                setMessage({
                    type: "error",
                    text: toErrorMessage(cause, `Unable to delete ${labels.noun}.`),
                });
                return false;
            }
        },
        [endpoint, labels.noun, records, selectedId]
    );

    return {
        records,
        selectedId,
        selected,
        message,
        isPending,
        setMessage,
        select,
        upsert,
        create,
        submit,
        remove,
    };
}
