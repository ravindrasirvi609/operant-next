import type { PbasApp } from "@/components/pbas/pbas-types";

export function PBASStatusTimeline({
    logs,
}: {
    logs: PbasApp["statusLogs"];
}) {
    return (
        <div className="grid gap-3">
            {logs.length ? (
                logs.map((log) => (
                    <div
                        className="rounded-lg border border-border bg-muted/50 p-4"
                        key={log._id ?? `${log.status}-${log.changedAt}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <p className="min-w-0 font-semibold text-foreground">{log.status}</p>
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                {new Date(log.changedAt).toLocaleString()}
                            </p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {log.actorName ? `${log.actorName} (${log.actorRole ?? "User"})` : "System"}
                        </p>
                        {log.remarks ? <p className="mt-1 text-sm text-muted-foreground">{log.remarks}</p> : null}
                    </div>
                ))
            ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                    No PBAS status updates recorded yet.
                </div>
            )}
        </div>
    );
}
