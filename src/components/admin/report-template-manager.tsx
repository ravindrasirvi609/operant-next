"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TemplateSection = {
    key: string;
    title: string;
    body: string;
    order: number;
    isActive: boolean;
};

type ReportTemplateRecord = {
    _id: string;
    reportType: string;
    name: string;
    description?: string;
    version: number;
    titleTemplate: string;
    subtitleTemplate?: string;
    metaTemplate?: string;
    introTemplate?: string;
    footerTemplate?: string;
    sections: TemplateSection[];
};

type PreviewCandidate = {
    id: string;
    label: string;
    subtitle?: string;
};

type TemplateFormState = {
    name: string;
    description: string;
    titleTemplate: string;
    subtitleTemplate: string;
    metaTemplate: string;
    introTemplate: string;
    footerTemplate: string;
    sections: TemplateSection[];
};

function toFormState(template: ReportTemplateRecord): TemplateFormState {
    return {
        name: template.name,
        description: template.description ?? "",
        titleTemplate: template.titleTemplate,
        subtitleTemplate: template.subtitleTemplate ?? "",
        metaTemplate: template.metaTemplate ?? "",
        introTemplate: template.introTemplate ?? "",
        footerTemplate: template.footerTemplate ?? "",
        sections: [...template.sections]
            .sort((left, right) => left.order - right.order || left.key.localeCompare(right.key))
            .map((section) => ({ ...section })),
    };
}

function requestJson<T>(url: string, options?: RequestInit) {
    return fetch(url, options).then(async (response) => {
        const data = (await response.json()) as T & { message?: string };
        if (!response.ok) {
            throw new Error(data.message || "Request failed.");
        }
        return data;
    });
}

function labelForReportType(reportType: string) {
    return reportType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function ReportTemplateManager({
    initialTemplates,
}: {
    initialTemplates: ReportTemplateRecord[];
}) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedId, setSelectedId] = useState(initialTemplates[0]?._id ?? "");
    const [form, setForm] = useState<TemplateFormState>(
        initialTemplates[0] ? toFormState(initialTemplates[0]) : {
            name: "",
            description: "",
            titleTemplate: "",
            subtitleTemplate: "",
            metaTemplate: "",
            introTemplate: "",
            footerTemplate: "",
            sections: [],
        }
    );
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [previewMode, setPreviewMode] = useState<"sample" | "live">("sample");
    const [previewCandidates, setPreviewCandidates] = useState<PreviewCandidate[]>([]);
    const [previewRecordId, setPreviewRecordId] = useState<string>("");
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewNonce, setPreviewNonce] = useState(0);
    const [isPending, startTransition] = useTransition();
    const [isLoadingPreview, startPreviewTransition] = useTransition();

    const selectedTemplate = useMemo(
        () => templates.find((template) => template._id === selectedId) ?? templates[0],
        [selectedId, templates]
    );

    function selectTemplate(nextId: string) {
        const template = templates.find((entry) => entry._id === nextId);
        if (!template) {
            return;
        }

        setSelectedId(nextId);
        setForm(toFormState(template));
        setMessage(null);
        setPreviewError(null);
        setPreviewNonce((current) => current + 1);
    }

    function updateSection(index: number, patch: Partial<TemplateSection>) {
        setForm((current) => ({
            ...current,
            sections: current.sections.map((section, sectionIndex) =>
                sectionIndex === index ? { ...section, ...patch } : section
            ),
        }));
    }

    function addSection() {
        setForm((current) => ({
            ...current,
            sections: [
                ...current.sections,
                {
                    key: `section_${current.sections.length + 1}`,
                    title: "New Section",
                    body: "Start with the purpose of this section, then list the key metrics, evidence expectations, approval notes, and any reviewer guidance using placeholders like {{exampleValue}}.",
                    order: current.sections.length + 1,
                    isActive: true,
                },
            ],
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedTemplate) {
            return;
        }

        startTransition(async () => {
            try {
                const response = await requestJson<{ template: ReportTemplateRecord }>(
                    `/api/admin/report-templates/${selectedTemplate._id}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form),
                    }
                );

                const nextTemplate = response.template;
                setTemplates((current) =>
                    current.map((entry) =>
                        entry.reportType === nextTemplate.reportType ? nextTemplate : entry
                    )
                );
                setSelectedId(nextTemplate._id);
                setForm(toFormState(nextTemplate));
                setMessage({
                    type: "success",
                    text: `Saved as version ${nextTemplate.version}. New exports will use this template.`,
                });
                setPreviewNonce((current) => current + 1);
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save template.",
                });
            }
        });
    }

    useEffect(() => {
        if (!selectedTemplate) {
            return;
        }

        startPreviewTransition(async () => {
            try {
                const response = await requestJson<{
                    candidates: PreviewCandidate[];
                    defaultRecordId?: string;
                }>(`/api/admin/report-templates/${selectedTemplate._id}/preview-data`);

                setPreviewCandidates(response.candidates ?? []);
                setPreviewRecordId((current) => {
                    if (previewMode === "sample") {
                        return "";
                    }

                    if (current && response.candidates.some((candidate) => candidate.id === current)) {
                        return current;
                    }

                    return response.defaultRecordId ?? response.candidates[0]?.id ?? "";
                });
                setPreviewError(null);
            } catch (error) {
                setPreviewCandidates([]);
                setPreviewRecordId("");
                setPreviewError(error instanceof Error ? error.message : "Unable to load preview options.");
            }
        });
    }, [previewMode, selectedTemplate, startPreviewTransition]);

    const previewQuery = useMemo(() => {
        const params = new URLSearchParams();
        params.set("mode", previewMode);
        if (previewMode === "live" && previewRecordId) {
            params.set("recordId", previewRecordId);
        }
        params.set("nonce", String(previewNonce));
        return params.toString();
    }, [previewMode, previewRecordId, previewNonce]);

    const previewUrl = selectedTemplate
        ? `/api/admin/report-templates/${selectedTemplate._id}/preview?${previewQuery}`
        : "";
    const downloadUrl = selectedTemplate
        ? `/api/admin/report-templates/${selectedTemplate._id}/download?${previewQuery}`
        : "";

    if (!selectedTemplate) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
                No report templates are available yet.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Template Library</CardTitle>
                    <CardDescription>
                        Edit the active template for each report type. Use structured, publication-ready copy so the preview reads like a final production document. Saving creates a new active version.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    {templates.map((template) => (
                        <button
                            key={template._id}
                            type="button"
                            onClick={() => selectTemplate(template._id)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                                template._id === selectedId
                                    ? "border-zinc-900 bg-zinc-900 text-white"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                            }`}
                        >
                            <div className="text-sm font-semibold">{template.name}</div>
                            <div className="mt-1 text-xs opacity-80">
                                {labelForReportType(template.reportType)} • v{template.version}
                            </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center gap-3">
                            <CardTitle>{selectedTemplate.name}</CardTitle>
                            <Badge variant="secondary">{labelForReportType(selectedTemplate.reportType)}</Badge>
                            <Badge variant="outline">Current v{selectedTemplate.version}</Badge>
                        </div>
                        <CardDescription>
                            Use placeholders like `{"{{facultyName}}"}` or `{"{{academicYear}}"}` inside any text field.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="template-description">Description</Label>
                            <Input
                                id="template-description"
                                value={form.description}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, description: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title-template">Title Template</Label>
                            <Input
                                id="title-template"
                                value={form.titleTemplate}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, titleTemplate: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subtitle-template">Subtitle Template</Label>
                            <Input
                                id="subtitle-template"
                                value={form.subtitleTemplate}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, subtitleTemplate: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="meta-template">Meta Line Template</Label>
                            <Input
                                id="meta-template"
                                value={form.metaTemplate}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, metaTemplate: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="intro-template">Intro Template</Label>
                            <Textarea
                                id="intro-template"
                                rows={3}
                                value={form.introTemplate}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, introTemplate: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="footer-template">Footer Template</Label>
                            <Textarea
                                id="footer-template"
                                rows={3}
                                value={form.footerTemplate}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, footerTemplate: event.target.value }))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preview & Download</CardTitle>
                        <CardDescription>
                            Review the active template against a sample document or a live institutional record before sharing exports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[160px_1fr_auto]">
                            <div className="space-y-2">
                                <Label htmlFor="preview-mode">Preview Source</Label>
                                <select
                                    id="preview-mode"
                                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                                    value={previewMode}
                                    onChange={(event) =>
                                        setPreviewMode(event.target.value === "live" ? "live" : "sample")
                                    }
                                >
                                    <option value="sample">Sample Data</option>
                                    <option value="live">Live Record</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="preview-record">Live Record</Label>
                                <select
                                    id="preview-record"
                                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                                    value={previewRecordId}
                                    disabled={previewMode !== "live" || isLoadingPreview || previewCandidates.length === 0}
                                    onChange={(event) => setPreviewRecordId(event.target.value)}
                                >
                                    {previewCandidates.length === 0 ? (
                                        <option value="">
                                            {previewMode === "live"
                                                ? "No live records available"
                                                : "Sample mode selected"}
                                        </option>
                                    ) : null}
                                    {previewCandidates.map((candidate) => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {candidate.label}
                                            {candidate.subtitle ? ` - ${candidate.subtitle}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPreviewNonce((current) => current + 1)}
                                >
                                    Refresh Preview
                                </Button>
                                <Button asChild type="button">
                                    <a href={downloadUrl} target="_blank" rel="noreferrer">
                                        Download PDF
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {previewError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {previewError}
                            </div>
                        ) : null}

                        {previewMode === "live" && previewCandidates.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                                No live records are available yet for this template type. Switch to sample mode to review the layout.
                            </div>
                        ) : previewMode === "live" && !previewRecordId ? (
                            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                                Select a live record to load the preview.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                <iframe
                                    key={previewUrl}
                                    src={previewUrl}
                                    title="Report template preview"
                                    className="h-[720px] w-full"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle>Sections</CardTitle>
                                <CardDescription>
                                    Reword, reorder, or disable individual sections without touching code. Strong sections usually include context, metrics, evidence, review notes, and release guidance.
                                </CardDescription>
                            </div>
                            <Button type="button" variant="outline" onClick={addSection}>
                                Add Section
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {form.sections.map((section, index) => (
                            <div key={`${section.key}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px]">
                                    <div className="space-y-2">
                                        <Label>Section Key</Label>
                                        <Input
                                            value={section.key}
                                            onChange={(event) =>
                                                updateSection(index, { key: event.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Section Title</Label>
                                        <Input
                                            value={section.title}
                                            onChange={(event) =>
                                                updateSection(index, { title: event.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Order</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={section.order}
                                            onChange={(event) =>
                                                updateSection(index, {
                                                    order: Number(event.target.value || index + 1),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <Label>Section Body</Label>
                                    <Textarea
                                        rows={4}
                                        value={section.body}
                                        onChange={(event) =>
                                            updateSection(index, { body: event.target.value })
                                        }
                                    />
                                </div>
                                <label className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
                                    <input
                                        type="checkbox"
                                        checked={section.isActive}
                                        onChange={(event) =>
                                            updateSection(index, { isActive: event.target.checked })
                                        }
                                    />
                                    Section is active
                                </label>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {message ? (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            message.type === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                    >
                        {message.text}
                    </div>
                ) : null}

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving version..." : "Save Template Version"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
