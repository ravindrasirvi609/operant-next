/**
 * The one client-side JSON fetch helper.
 *
 * Before this existed, ~30 call sites across the PBAS/AQAR/CAS/SSR modules each
 * open-coded `fetch(...).then((r) => r.json())` with three different error
 * conventions:
 *
 *   1. `if (!response.ok || !data.application) setMessage(...)`  — PBAS/AQAR/CAS
 *   2. `.catch(() => setError("Unable to load ..."))`            — the GET effects
 *   3. `throw new Error(data.message ?? "Request failed.")`      — SSR only
 *
 * Convention 1 leaks the server's shape into every handler, and convention 2
 * throws away the server's message entirely. `requestJson` always surfaces the
 * server's `message` when there is one, so the UI can show something actionable
 * instead of a generic "Unable to load".
 */

export class ApiError extends Error {
    readonly status: number;
    readonly payload: unknown;

    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }
}

/** Message shown when the server gave us nothing usable. */
const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function toErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
    if (error instanceof ApiError || error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
}

type RequestOptions = Omit<RequestInit, "body"> & {
    /** Plain object — serialized as JSON. Pass a string/FormData via `rawBody`. */
    body?: unknown;
    rawBody?: RequestInit["body"];
    /** Used when the response carries no `message` of its own. */
    fallbackMessage?: string;
};

export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { body, rawBody, fallbackMessage, headers, ...rest } = options;
    const hasJsonBody = body !== undefined;

    const response = await fetch(url, {
        ...rest,
        headers: {
            ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
            ...headers,
        },
        body: hasJsonBody ? JSON.stringify(body) : rawBody,
    });

    // A 204, or an HTML error page from a crashed route, both fail to parse.
    // Neither should surface as "Unexpected token < in JSON".
    let payload: unknown = null;
    const text = await response.text();
    if (text) {
        try {
            payload = JSON.parse(text) as unknown;
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        const serverMessage =
            payload && typeof payload === "object" && "message" in payload
                ? String((payload as { message?: unknown }).message ?? "")
                : "";

        throw new ApiError(
            serverMessage || fallbackMessage || `Request failed (${response.status}).`,
            response.status,
            payload
        );
    }

    return payload as T;
}
