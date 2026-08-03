"use client";

import { FileCheck2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { UploadedDocument } from "@/lib/upload/service";
import type { CasDocumentItem } from "@/components/cas/cas-types";

/**
 * Mandatory evidence checklist. Missing mandatory documents block submission.
 *
 * Two changes beyond styling. The original showed "Mandatory" / "Optional" as
 * plain grey text of the same weight and colour, so the distinction that actually
 * gates submission was the least visible thing on the row — it is a tinted badge
 * now. And the count of what is still outstanding was nowhere on the step; it was
 * only discoverable by pressing Submit and reading the resulting error.
 */
export function CasStepDocumentsChecklist({
    canEdit,
    facultyId,
    documents,
    docLoading,
    docError,
    onPersistDocument,
}: {
    canEdit: boolean;
    facultyId: string;
    documents: CasDocumentItem[];
    docLoading: boolean;
    docError: string | null;
    onPersistDocument: (documentType: string, documentId: string) => void;
}) {
    const missingMandatory = documents.filter((doc) => doc.isMandatory && !doc.documentId?._id);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Documents"
                description="Upload the mandatory evidence for your promotion path."
            />

            {docLoading ? (
                <div className="space-y-3" aria-busy>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={`doc-skeleton-${index}`} className="h-28 w-full" />
                    ))}
                </div>
            ) : docError ? (
                <InlineAlert message={{ type: "error", text: docError }} />
            ) : documents.length ? (
                <>
                    {missingMandatory.length ? (
                        <InlineAlert
                            tone="warning"
                            title={`${missingMandatory.length} mandatory document${missingMandatory.length === 1 ? "" : "s"} outstanding`}
                        >
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                                {missingMandatory.map((doc) => (
                                    <li key={doc.documentType}>{doc.label}</li>
                                ))}
                            </ul>
                        </InlineAlert>
                    ) : (
                        <InlineAlert tone="success" title="All mandatory documents uploaded" />
                    )}

                    <ul className="space-y-3">
                        {documents.map((doc) => {
                            const uploaded = Boolean(doc.documentId?._id);

                            return (
                                <li key={doc.documentType} className="space-y-3 rounded-lg border bg-card p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold break-words text-foreground">
                                                {doc.label}
                                            </p>
                                            {doc.documentId?.fileUrl ? (
                                                <a
                                                    href={doc.documentId.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    {doc.documentId.fileName || "View uploaded file"}
                                                </a>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {doc.isMandatory ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-warning-border bg-warning-muted text-warning-muted-foreground"
                                                >
                                                    Mandatory
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Optional</Badge>
                                            )}
                                            {uploaded ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-success-border bg-success-muted text-success-muted-foreground"
                                                >
                                                    Uploaded
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <FileUpload
                                        category="document"
                                        ownerId={facultyId}
                                        mode="document"
                                        disabled={!canEdit}
                                        value={
                                            doc.documentId
                                                ? (doc.documentId as unknown as UploadedDocument)
                                                : null
                                        }
                                        onChange={(next) => {
                                            if (!canEdit) return;
                                            if (next && typeof next === "object") {
                                                onPersistDocument(
                                                    doc.documentType,
                                                    (next as UploadedDocument)._id
                                                );
                                            }
                                        }}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </>
            ) : (
                <EmptyState
                    bordered
                    icon={FileCheck2}
                    title="No document checklist configured"
                    description="Your institution has not defined a CAS document checklist for this promotion path yet."
                    className="py-8"
                />
            )}
        </div>
    );
}
