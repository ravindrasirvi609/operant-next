"use client";

import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import type { UploadedDocument } from "@/lib/upload/service";
import type { CasDocumentItem } from "@/components/cas/cas-types";

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
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>CAS Document Checklist</CardTitle>
                    <CardDescription>
                        Upload mandatory documents to complete CAS submission.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {docLoading ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                            Loading CAS documents...
                        </div>
                    ) : docError ? (
                        <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                            {docError}
                        </div>
                    ) : documents.length ? (
                        documents.map((doc) => (
                            <div key={doc.documentType} className="rounded-lg border border-border p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{doc.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.isMandatory ? "Mandatory" : "Optional"}
                                        </p>
                                    </div>
                                    {doc.documentId?.fileUrl && (
                                        <a
                                            href={doc.documentId.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-medium text-success-muted-foreground"
                                        >
                                            <ShieldCheck className="size-4" />
                                            {doc.documentId.fileName || "Uploaded"}
                                        </a>
                                    )}
                                </div>
                                <FileUpload
                                    category="document"
                                    ownerId={facultyId}
                                    mode="document"
                                    disabled={!canEdit}
                                    value={doc.documentId ? (doc.documentId as unknown as UploadedDocument) : null}
                                    onChange={(uploaded) => {
                                        if (!canEdit) return;
                                        if (uploaded && typeof uploaded === "object") {
                                            onPersistDocument(doc.documentType, (uploaded as UploadedDocument)._id);
                                        }
                                    }}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                            No CAS documents defined yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
