"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SourceCategory =
    | "facultyPublications"
    | "facultyPatents"
    | "facultyProjects"
    | "facultyConsultancies"
    | "researchPublications"
    | "researchProjects"
    | "intellectualProperties"
    | "researchActivities"
    | "studentPublications"
    | "studentProjects";

type SourceOption = {
    id: string;
    title: string;
    subtitle?: string;
    summary?: string;
    ownerLabel?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
    link?: string;
    sourceType: string;
};

type SourceCatalog = Record<SourceCategory, SourceOption[]>;

type ActivityRecord = {
    id: string;
    activityType: string;
    title: string;
    leadName?: string;
    partnerName?: string;
    startDate?: string;
    endDate?: string;
    participantCount?: number;
    fundingAmount?: number;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
};

type GrantRecord = {
    id: string;
    grantType: string;
    title: string;
    schemeName?: string;
    sponsorName?: string;
    beneficiaryName?: string;
    sanctionedAmount?: number;
    releasedAmount?: number;
    awardDate?: string;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
};

type StartupRecord = {
    id: string;
    startupName: string;
    supportType: string;
    stage: string;
    founderNames?: string;
    sector?: string;
    incubationCell?: string;
    registrationNumber?: string;
    supportStartDate?: string;
    supportEndDate?: string;
    fundingAmount?: number;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
};

type AssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    scopeType: string;
    focusArea: string;
    unitLabel: string;
    planStatus: string;
    planSummary?: string;
    planStrategyGoals?: string;
    planTargets: {
        publications: number;
        projects: number;
        patents: number;
        consultancies: number;
        studentResearch: number;
        innovationActivities: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    researchStrategy?: string;
    fundingPipeline?: string;
    publicationQualityPractices?: string;
    innovationEcosystem?: string;
    incubationSupport?: string;
    consultancyTranslation?: string;
    iprCommercialization?: string;
    studentResearchEngagement?: string;
    collaborationHighlights?: string;
    ethicsAndCompliance?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    }>;
    contributorRemarks?: string;
    reviewRemarks?: string;
    sourceCatalog: SourceCatalog;
    linkedSources: SourceCatalog;
    sourceMetrics: {
        available: Record<SourceCategory, number>;
        linked: Record<SourceCategory, number>;
        linkedTotal: number;
    };
    activities: ActivityRecord[];
    grants: GrantRecord[];
    startups: StartupRecord[];
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: string;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string;
    }>;
    valueSummary: string;
    submittedAt?: string;
    reviewedAt?: string;
    approvedAt?: string;
    updatedAt?: string;
    currentStageLabel: string;
};

type ActivityRow = {
    id?: string;
    activityType: string;
    title: string;
    leadName: string;
    partnerName: string;
    startDate: string;
    endDate: string;
    participantCount: string;
    fundingAmount: string;
    stage: string;
    outcomeSummary: string;
    followUpAction: string;
    documentId: string;
};

type GrantRow = {
    id?: string;
    grantType: string;
    title: string;
    schemeName: string;
    sponsorName: string;
    beneficiaryName: string;
    sanctionedAmount: string;
    releasedAmount: string;
    awardDate: string;
    stage: string;
    outcomeSummary: string;
    followUpAction: string;
    documentId: string;
};

type StartupRow = {
    id?: string;
    startupName: string;
    supportType: string;
    stage: string;
    founderNames: string;
    sector: string;
    incubationCell: string;
    registrationNumber: string;
    supportStartDate: string;
    supportEndDate: string;
    fundingAmount: string;
    outcomeSummary: string;
    followUpAction: string;
    documentId: string;
};

type FormState = {
    researchStrategy: string;
    fundingPipeline: string;
    publicationQualityPractices: string;
    innovationEcosystem: string;
    incubationSupport: string;
    consultancyTranslation: string;
    iprCommercialization: string;
    studentResearchEngagement: string;
    collaborationHighlights: string;
    ethicsAndCompliance: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
    selectedSources: Record<SourceCategory, string[]>;
    activities: ActivityRow[];
    grants: GrantRow[];
    startups: StartupRow[];
};

const sourceSections: Array<{ key: SourceCategory; label: string; description: string }> = [
    { key: "facultyPublications", label: "Faculty Publications", description: "Linked faculty journal, book, and indexed publication records." },
    { key: "facultyPatents", label: "Faculty Patents", description: "Faculty IP claims with filing, publication, or grant status." },
    { key: "facultyProjects", label: "Faculty Projects", description: "Faculty research projects and grant-backed work." },
    { key: "facultyConsultancies", label: "Faculty Consultancy", description: "Faculty consultancy and externally engaged research translation." },
    { key: "researchPublications", label: "Institutional Publications", description: "Legacy institutional publication register entries." },
    { key: "researchProjects", label: "Institutional Projects", description: "Legacy research, collaboration, and project register entries." },
    { key: "intellectualProperties", label: "Institutional IP", description: "Institutional IP, copyright, e-content, and design records." },
    { key: "researchActivities", label: "Research Activities", description: "Research guidance, fellowship, and scholar progression records." },
    { key: "studentPublications", label: "Student Publications", description: "Student-led publication evidence within the scoped unit." },
    { key: "studentProjects", label: "Student Research Projects", description: "Student research and guided project records in scope." },
];

const narrativeFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "researchStrategy", label: "Research strategy", placeholder: "Describe the department or institution research direction, quality priorities, and implementation approach." },
    { key: "fundingPipeline", label: "Funding pipeline", placeholder: "Capture grant mobilization, proposal movement, sanctioned funding, and pipeline risk." },
    { key: "publicationQualityPractices", label: "Publication quality practices", placeholder: "Explain indexing standards, authorship validation, peer review readiness, and quality control." },
    { key: "innovationEcosystem", label: "Innovation ecosystem", placeholder: "Describe innovation culture, ecosystem enablers, labs, cells, or institutional mechanisms." },
    { key: "incubationSupport", label: "Incubation support", placeholder: "Capture startup mentoring, incubation access, prototyping support, and entrepreneur enablement." },
    { key: "consultancyTranslation", label: "Consultancy translation", placeholder: "Explain how research is being translated into consultancy, training, or applied engagement." },
    { key: "iprCommercialization", label: "IPR and commercialization", placeholder: "Describe patent strategy, commercialization progress, licensing, or transfer readiness." },
    { key: "studentResearchEngagement", label: "Student research engagement", placeholder: "Explain student research culture, mentoring, publications, and project participation." },
    { key: "collaborationHighlights", label: "Collaboration highlights", placeholder: "Summarize collaborations, MoUs, centers, industry linkages, and multi-institution engagement." },
    { key: "ethicsAndCompliance", label: "Ethics and compliance", placeholder: "Capture ethics clearance, plagiarism control, compliance oversight, and governance safeguards." },
];

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function statusBadge(status: string) {
    if (status === "Approved") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (["Submitted", "Research Review", "Under Review", "Committee Review"].includes(status)) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

function splitLines(value: string) {
    return value
        .split(/\n+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function splitCommaValues(value: string) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function emptyActivityRow(): ActivityRow {
    return {
        activityType: "Incubation",
        title: "",
        leadName: "",
        partnerName: "",
        startDate: "",
        endDate: "",
        participantCount: "",
        fundingAmount: "",
        stage: "Ongoing",
        outcomeSummary: "",
        followUpAction: "",
        documentId: "",
    };
}

function emptyGrantRow(): GrantRow {
    return {
        grantType: "SeedFunding",
        title: "",
        schemeName: "",
        sponsorName: "",
        beneficiaryName: "",
        sanctionedAmount: "",
        releasedAmount: "",
        awardDate: "",
        stage: "Proposed",
        outcomeSummary: "",
        followUpAction: "",
        documentId: "",
    };
}

function emptyStartupRow(): StartupRow {
    return {
        startupName: "",
        supportType: "Incubation",
        stage: "Ideation",
        founderNames: "",
        sector: "",
        incubationCell: "",
        registrationNumber: "",
        supportStartDate: "",
        supportEndDate: "",
        fundingAmount: "",
        outcomeSummary: "",
        followUpAction: "",
        documentId: "",
    };
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        researchStrategy: record.researchStrategy ?? "",
        fundingPipeline: record.fundingPipeline ?? "",
        publicationQualityPractices: record.publicationQualityPractices ?? "",
        innovationEcosystem: record.innovationEcosystem ?? "",
        incubationSupport: record.incubationSupport ?? "",
        consultancyTranslation: record.consultancyTranslation ?? "",
        iprCommercialization: record.iprCommercialization ?? "",
        studentResearchEngagement: record.studentResearchEngagement ?? "",
        collaborationHighlights: record.collaborationHighlights ?? "",
        ethicsAndCompliance: record.ethicsAndCompliance ?? "",
        supportingLinks: (record.supportingLinks ?? []).join("\n"),
        documentIds: (record.documentIds ?? []).join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        selectedSources: {
            facultyPublications: record.linkedSources.facultyPublications.map((item) => item.id),
            facultyPatents: record.linkedSources.facultyPatents.map((item) => item.id),
            facultyProjects: record.linkedSources.facultyProjects.map((item) => item.id),
            facultyConsultancies: record.linkedSources.facultyConsultancies.map((item) => item.id),
            researchPublications: record.linkedSources.researchPublications.map((item) => item.id),
            researchProjects: record.linkedSources.researchProjects.map((item) => item.id),
            intellectualProperties: record.linkedSources.intellectualProperties.map((item) => item.id),
            researchActivities: record.linkedSources.researchActivities.map((item) => item.id),
            studentPublications: record.linkedSources.studentPublications.map((item) => item.id),
            studentProjects: record.linkedSources.studentProjects.map((item) => item.id),
        },
        activities: record.activities.length
            ? record.activities.map((item) => ({
                  id: item.id,
                  activityType: item.activityType,
                  title: item.title,
                  leadName: item.leadName ?? "",
                  partnerName: item.partnerName ?? "",
                  startDate: item.startDate ? item.startDate.slice(0, 10) : "",
                  endDate: item.endDate ? item.endDate.slice(0, 10) : "",
                  participantCount:
                      item.participantCount !== undefined ? String(item.participantCount) : "",
                  fundingAmount:
                      item.fundingAmount !== undefined ? String(item.fundingAmount) : "",
                  stage: item.stage,
                  outcomeSummary: item.outcomeSummary ?? "",
                  followUpAction: item.followUpAction ?? "",
                  documentId: item.documentId ?? "",
              }))
            : [emptyActivityRow()],
        grants: record.grants.length
            ? record.grants.map((item) => ({
                  id: item.id,
                  grantType: item.grantType,
                  title: item.title,
                  schemeName: item.schemeName ?? "",
                  sponsorName: item.sponsorName ?? "",
                  beneficiaryName: item.beneficiaryName ?? "",
                  sanctionedAmount:
                      item.sanctionedAmount !== undefined ? String(item.sanctionedAmount) : "",
                  releasedAmount:
                      item.releasedAmount !== undefined ? String(item.releasedAmount) : "",
                  awardDate: item.awardDate ? item.awardDate.slice(0, 10) : "",
                  stage: item.stage,
                  outcomeSummary: item.outcomeSummary ?? "",
                  followUpAction: item.followUpAction ?? "",
                  documentId: item.documentId ?? "",
              }))
            : [emptyGrantRow()],
        startups: record.startups.length
            ? record.startups.map((item) => ({
                  id: item.id,
                  startupName: item.startupName,
                  supportType: item.supportType,
                  stage: item.stage,
                  founderNames: item.founderNames ?? "",
                  sector: item.sector ?? "",
                  incubationCell: item.incubationCell ?? "",
                  registrationNumber: item.registrationNumber ?? "",
                  supportStartDate: item.supportStartDate ? item.supportStartDate.slice(0, 10) : "",
                  supportEndDate: item.supportEndDate ? item.supportEndDate.slice(0, 10) : "",
                  fundingAmount:
                      item.fundingAmount !== undefined ? String(item.fundingAmount) : "",
                  outcomeSummary: item.outcomeSummary ?? "",
                  followUpAction: item.followUpAction ?? "",
                  documentId: item.documentId ?? "",
              }))
            : [emptyStartupRow()],
    };
}

export function ResearchInnovationContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [form, setForm] = useState<FormState>(
        assignments[0]
            ? buildInitialForm(assignments[0])
            : {
                  researchStrategy: "",
                  fundingPipeline: "",
                  publicationQualityPractices: "",
                  innovationEcosystem: "",
                  incubationSupport: "",
                  consultancyTranslation: "",
                  iprCommercialization: "",
                  studentResearchEngagement: "",
                  collaborationHighlights: "",
                  ethicsAndCompliance: "",
                  supportingLinks: "",
                  documentIds: "",
                  contributorRemarks: "",
                  selectedSources: {
                      facultyPublications: [],
                      facultyPatents: [],
                      facultyProjects: [],
                      facultyConsultancies: [],
                      researchPublications: [],
                      researchProjects: [],
                      intellectualProperties: [],
                      researchActivities: [],
                      studentPublications: [],
                      studentProjects: [],
                  },
                  activities: [emptyActivityRow()],
                  grants: [emptyGrantRow()],
                  startups: [emptyStartupRow()],
              }
    );
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredAssignments = assignments.filter((assignment) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            assignment.planTitle,
            assignment.academicYearLabel,
            assignment.unitLabel,
            assignment.status,
            assignment.currentStageLabel,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!filteredAssignments.length) {
            setSelectedId("");
            return;
        }

        if (!filteredAssignments.some((item) => item._id === selectedId)) {
            setSelectedId(filteredAssignments[0]._id);
        }
    }, [filteredAssignments, selectedId]);

    const selectedAssignment =
        filteredAssignments.find((assignment) => assignment._id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedAssignment) {
            return;
        }

        setForm(buildInitialForm(selectedAssignment));
    }, [selectedAssignment]);

    function updateNarrative(key: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function toggleSource(category: SourceCategory, id: string, checked: boolean) {
        setForm((current) => {
            const existing = new Set(current.selectedSources[category]);
            if (checked) {
                existing.add(id);
            } else {
                existing.delete(id);
            }

            return {
                ...current,
                selectedSources: {
                    ...current.selectedSources,
                    [category]: Array.from(existing),
                },
            };
        });
    }

    function updateActivityRow(index: number, key: keyof ActivityRow, value: string) {
        setForm((current) => ({
            ...current,
            activities: current.activities.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateGrantRow(index: number, key: keyof GrantRow, value: string) {
        setForm((current) => ({
            ...current,
            grants: current.grants.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateStartupRow(index: number, key: keyof StartupRow, value: string) {
        setForm((current) => ({
            ...current,
            startups: current.startups.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function buildDraftPayload() {
        return {
            researchStrategy: form.researchStrategy.trim(),
            fundingPipeline: form.fundingPipeline.trim(),
            publicationQualityPractices: form.publicationQualityPractices.trim(),
            innovationEcosystem: form.innovationEcosystem.trim(),
            incubationSupport: form.incubationSupport.trim(),
            consultancyTranslation: form.consultancyTranslation.trim(),
            iprCommercialization: form.iprCommercialization.trim(),
            studentResearchEngagement: form.studentResearchEngagement.trim(),
            collaborationHighlights: form.collaborationHighlights.trim(),
            ethicsAndCompliance: form.ethicsAndCompliance.trim(),
            facultyPublicationIds: form.selectedSources.facultyPublications,
            facultyPatentIds: form.selectedSources.facultyPatents,
            facultyResearchProjectIds: form.selectedSources.facultyProjects,
            facultyConsultancyIds: form.selectedSources.facultyConsultancies,
            researchPublicationIds: form.selectedSources.researchPublications,
            researchProjectIds: form.selectedSources.researchProjects,
            intellectualPropertyIds: form.selectedSources.intellectualProperties,
            researchActivityIds: form.selectedSources.researchActivities,
            studentPublicationIds: form.selectedSources.studentPublications,
            studentResearchProjectIds: form.selectedSources.studentProjects,
            supportingLinks: splitLines(form.supportingLinks),
            documentIds: splitCommaValues(form.documentIds),
            contributorRemarks: form.contributorRemarks.trim(),
            activities: form.activities
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    activityType: row.activityType,
                    title: row.title.trim(),
                    leadName: row.leadName.trim(),
                    partnerName: row.partnerName.trim(),
                    startDate: row.startDate || undefined,
                    endDate: row.endDate || undefined,
                    participantCount:
                        row.participantCount.trim() === ""
                            ? undefined
                            : Number(row.participantCount),
                    fundingAmount:
                        row.fundingAmount.trim() === ""
                            ? undefined
                            : Number(row.fundingAmount),
                    stage: row.stage,
                    outcomeSummary: row.outcomeSummary.trim(),
                    followUpAction: row.followUpAction.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            grants: form.grants
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    grantType: row.grantType,
                    title: row.title.trim(),
                    schemeName: row.schemeName.trim(),
                    sponsorName: row.sponsorName.trim(),
                    beneficiaryName: row.beneficiaryName.trim(),
                    sanctionedAmount:
                        row.sanctionedAmount.trim() === ""
                            ? undefined
                            : Number(row.sanctionedAmount),
                    releasedAmount:
                        row.releasedAmount.trim() === ""
                            ? undefined
                            : Number(row.releasedAmount),
                    awardDate: row.awardDate || undefined,
                    stage: row.stage,
                    outcomeSummary: row.outcomeSummary.trim(),
                    followUpAction: row.followUpAction.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            startups: form.startups
                .filter((row) => row.startupName.trim())
                .map((row, index) => ({
                    _id: row.id,
                    startupName: row.startupName.trim(),
                    supportType: row.supportType,
                    stage: row.stage,
                    founderNames: row.founderNames.trim(),
                    sector: row.sector.trim(),
                    incubationCell: row.incubationCell.trim(),
                    registrationNumber: row.registrationNumber.trim(),
                    supportStartDate: row.supportStartDate || undefined,
                    supportEndDate: row.supportEndDate || undefined,
                    fundingAmount:
                        row.fundingAmount.trim() === ""
                            ? undefined
                            : Number(row.fundingAmount),
                    outcomeSummary: row.outcomeSummary.trim(),
                    followUpAction: row.followUpAction.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
        };
    }

    async function persistDraft(assignmentId: string) {
        return requestJson<{ message?: string }>(
            `/api/research-innovation/assignments/${assignmentId}/contribution`,
            {
                method: "PUT",
                body: JSON.stringify(buildDraftPayload()),
            }
        );
    }

    function saveDraft() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await persistDraft(selectedAssignment._id);

                setMessage({
                    type: "success",
                    text: data.message ?? "Research & innovation draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the research & innovation draft.",
                });
            }
        });
    }

    function submitAssignment() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                await persistDraft(selectedAssignment._id);

                const data = await requestJson<{ message?: string }>(
                    `/api/research-innovation/assignments/${selectedAssignment._id}/submit`,
                    { method: "POST" }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Research & innovation assignment submitted successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to submit the research & innovation assignment.",
                });
            }
        });
    }

    if (!assignments.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Research & Innovation Workspace</CardTitle>
                    <CardDescription>
                        No research & innovation assignments are mapped to this account yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const canEdit = selectedAssignment
        ? ["Draft", "Rejected"].includes(selectedAssignment.status)
        : false;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{actorLabel} Research & Innovation workspace</CardTitle>
                    <CardDescription>
                        Complete the scoped research portfolio with evidence-linked source records, structured innovation activity rows, and institutional narrative before sending it into governance review.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        className="max-w-sm"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by plan, unit, or status"
                        value={search}
                    />

                    {message ? (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                                message.type === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                    : "border-rose-200 bg-rose-50 text-rose-900"
                            }`}
                        >
                            {message.text}
                        </div>
                    ) : null}

                    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                        <div className="space-y-3">
                            {filteredAssignments.map((assignment) => {
                                const active = assignment._id === selectedId;

                                return (
                                    <button
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            active
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                        }`}
                                        key={assignment._id}
                                        onClick={() => setSelectedId(assignment._id)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                                                    {assignment.focusArea}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold">
                                                    {assignment.planTitle}
                                                </p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {assignment.unitLabel} · {assignment.academicYearLabel}
                                                </p>
                                            </div>
                                            <div>{statusBadge(assignment.status)}</div>
                                        </div>
                                        <p className="mt-3 text-xs opacity-80">
                                            {assignment.currentStageLabel} · {assignment.valueSummary}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedAssignment ? (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(selectedAssignment.status)}
                                                <Badge variant="secondary">
                                                    {selectedAssignment.currentStageLabel}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {selectedAssignment.scopeType}
                                                </Badge>
                                            </div>
                                            <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                                                {selectedAssignment.planTitle}
                                            </h3>
                                            <p className="mt-2 text-sm text-zinc-600">
                                                {selectedAssignment.unitLabel} · {selectedAssignment.academicYearLabel} ·{" "}
                                                {selectedAssignment.focusArea}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-500">
                                                Due {formatDate(selectedAssignment.dueDate)} · Plan status{" "}
                                                {selectedAssignment.planStatus}
                                            </p>
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            <p>
                                                Linked records: {selectedAssignment.sourceMetrics.linkedTotal}
                                            </p>
                                            <p>
                                                Activities: {selectedAssignment.activities.length}
                                            </p>
                                            <p>Grant rows: {selectedAssignment.grants.length}</p>
                                            <p>Startup rows: {selectedAssignment.startups.length}</p>
                                            <p>Updated: {formatDate(selectedAssignment.updatedAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                                        <MetricCard label="Publication target" value={selectedAssignment.planTargets.publications} />
                                        <MetricCard label="Project target" value={selectedAssignment.planTargets.projects} />
                                        <MetricCard label="Patent target" value={selectedAssignment.planTargets.patents} />
                                        <MetricCard label="Consultancy target" value={selectedAssignment.planTargets.consultancies} />
                                        <MetricCard label="Student research target" value={selectedAssignment.planTargets.studentResearch} />
                                        <MetricCard label="Innovation activity target" value={selectedAssignment.planTargets.innovationActivities} />
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                                        <p>{selectedAssignment.planSummary?.trim() || "No plan summary provided."}</p>
                                        <p>{selectedAssignment.planStrategyGoals?.trim() || "No strategy goals defined on the plan."}</p>
                                        {selectedAssignment.notes ? (
                                            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-600">
                                                {selectedAssignment.notes}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Narrative and Evidence</CardTitle>
                                        <CardDescription>
                                            Fill each narrative section carefully and link only source records that belong to this plan’s scoped academic year and unit.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {narrativeFields.map((field) => (
                                            <div className="space-y-2" key={field.key}>
                                                <Label>{field.label}</Label>
                                                <Textarea
                                                    disabled={!canEdit}
                                                    onChange={(event) =>
                                                        updateNarrative(field.key, event.target.value)
                                                    }
                                                    placeholder={field.placeholder}
                                                    rows={4}
                                                    value={String(form[field.key] ?? "")}
                                                />
                                            </div>
                                        ))}

                                        <div className="space-y-2">
                                            <Label>Supporting links</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        supportingLinks: event.target.value,
                                                    }))
                                                }
                                                placeholder="One URL per line"
                                                rows={4}
                                                value={form.supportingLinks}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Manual evidence document IDs</Label>
                                            <Input
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        documentIds: event.target.value,
                                                    }))
                                                }
                                                placeholder="Comma-separated document IDs"
                                                value={form.documentIds}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Contributor remarks</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        contributorRemarks: event.target.value,
                                                    }))
                                                }
                                                placeholder="Add context for reviewers, known gaps, or pending follow-up."
                                                rows={3}
                                                value={form.contributorRemarks}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Linked Source Records</CardTitle>
                                        <CardDescription>
                                            Each selected record becomes part of the governed evidence trail for this portfolio.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {sourceSections.map((section) => {
                                            const options = selectedAssignment.sourceCatalog[section.key];
                                            const selected = new Set(form.selectedSources[section.key]);

                                            return (
                                                <div className="space-y-3" key={section.key}>
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-950">
                                                            {section.label}
                                                        </p>
                                                        <p className="text-xs text-zinc-500">
                                                            {section.description}
                                                        </p>
                                                    </div>

                                                    {options.length ? (
                                                        <div className="space-y-3">
                                                            {options.map((option) => (
                                                                <label
                                                                    className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                                    key={option.id}
                                                                >
                                                                    <Checkbox
                                                                        checked={selected.has(option.id)}
                                                                        disabled={!canEdit}
                                                                        onCheckedChange={(checked) =>
                                                                            toggleSource(
                                                                                section.key,
                                                                                option.id,
                                                                                Boolean(checked)
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm font-medium text-zinc-950">
                                                                            {option.title}
                                                                        </p>
                                                                        <p className="text-xs text-zinc-500">
                                                                            {[option.subtitle, option.ownerLabel, option.summary]
                                                                                .filter(Boolean)
                                                                                .join(" · ")}
                                                                        </p>
                                                                        {option.document?.fileUrl ? (
                                                                            <a
                                                                                className="text-xs font-medium text-zinc-900 underline"
                                                                                href={option.document.fileUrl}
                                                                                rel="noreferrer"
                                                                                target="_blank"
                                                                            >
                                                                                Evidence: {option.document.fileName || "Open document"}
                                                                                {option.document.verificationStatus
                                                                                    ? ` · ${option.document.verificationStatus}`
                                                                                    : ""}
                                                                            </a>
                                                                        ) : option.link ? (
                                                                            <a
                                                                                className="text-xs font-medium text-zinc-900 underline"
                                                                                href={option.link}
                                                                                rel="noreferrer"
                                                                                target="_blank"
                                                                            >
                                                                                Open linked evidence
                                                                            </a>
                                                                        ) : null}
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                                            No scoped source records are currently available in this category.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Innovation Activities</CardTitle>
                                        <CardDescription>
                                            Add structured ecosystem activity rows for startup, incubation, prototype, and innovation support items that are not already normalized in the base system.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.activities.map((row, index) => (
                                            <div
                                                className="rounded-xl border border-zinc-200 p-4"
                                                key={row.id ?? `activity-${index}`}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Activity type</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) =>
                                                                updateActivityRow(index, "activityType", value)
                                                            }
                                                            value={row.activityType}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select activity type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "Incubation",
                                                                    "StartupMentoring",
                                                                    "PrototypeDevelopment",
                                                                    "SeedFunding",
                                                                    "Hackathon",
                                                                    "InnovationWorkshop",
                                                                    "TechnologyTransfer",
                                                                    "EntrepreneurshipCell",
                                                                    "IndustryCollaboration",
                                                                ].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Stage</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) =>
                                                                updateActivityRow(index, "stage", value)
                                                            }
                                                            value={row.stage}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select stage" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {["Planned", "Ongoing", "Completed"].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Title"
                                                        onChange={(value) => updateActivityRow(index, "title", value)}
                                                        placeholder="Innovation activity title"
                                                        value={row.title}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Lead name"
                                                        onChange={(value) => updateActivityRow(index, "leadName", value)}
                                                        placeholder="Lead faculty, cell, or unit"
                                                        value={row.leadName}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Partner name"
                                                        onChange={(value) => updateActivityRow(index, "partnerName", value)}
                                                        placeholder="Startup, incubator, or industry partner"
                                                        value={row.partnerName}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Document ID"
                                                        onChange={(value) => updateActivityRow(index, "documentId", value)}
                                                        placeholder="Evidence document ID"
                                                        value={row.documentId}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Start date"
                                                        onChange={(value) => updateActivityRow(index, "startDate", value)}
                                                        placeholder=""
                                                        type="date"
                                                        value={row.startDate}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="End date"
                                                        onChange={(value) => updateActivityRow(index, "endDate", value)}
                                                        placeholder=""
                                                        type="date"
                                                        value={row.endDate}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Participants"
                                                        onChange={(value) =>
                                                            updateActivityRow(index, "participantCount", value)
                                                        }
                                                        placeholder="0"
                                                        type="number"
                                                        value={row.participantCount}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Funding amount"
                                                        onChange={(value) =>
                                                            updateActivityRow(index, "fundingAmount", value)
                                                        }
                                                        placeholder="0"
                                                        type="number"
                                                        value={row.fundingAmount}
                                                    />
                                                </div>

                                                <div className="mt-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>Outcome summary</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                updateActivityRow(index, "outcomeSummary", event.target.value)
                                                            }
                                                            placeholder="Describe outcomes, deliverables, or translation impact."
                                                            rows={3}
                                                            value={row.outcomeSummary}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Follow-up action</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                updateActivityRow(index, "followUpAction", event.target.value)
                                                            }
                                                            placeholder="Describe next actions, scale-up plan, or review dependency."
                                                            rows={3}
                                                            value={row.followUpAction}
                                                        />
                                                    </div>
                                                </div>

                                                {canEdit ? (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            onClick={() =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    activities:
                                                                        current.activities.length > 1
                                                                            ? current.activities.filter((_, rowIndex) => rowIndex !== index)
                                                                            : [emptyActivityRow()],
                                                                }))
                                                            }
                                                            type="button"
                                                            variant="ghost"
                                                        >
                                                            Remove row
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}

                                        {canEdit ? (
                                            <Button
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        activities: [...current.activities, emptyActivityRow()],
                                                    }))
                                                }
                                                type="button"
                                                variant="outline"
                                            >
                                                Add activity row
                                            </Button>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Seed Funding and Innovation Grants</CardTitle>
                                        <CardDescription>
                                            Capture first-class grant records for seed funding, innovation grants, prototype support, and translation funding.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.grants.map((row, index) => (
                                            <div
                                                className="rounded-xl border border-zinc-200 p-4"
                                                key={row.id ?? `grant-${index}`}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Grant type</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) => updateGrantRow(index, "grantType", value)}
                                                            value={row.grantType}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select grant type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "SeedFunding",
                                                                    "InnovationGrant",
                                                                    "PrototypeGrant",
                                                                    "StartupSupport",
                                                                    "ResearchTranslationGrant",
                                                                ].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Stage</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) => updateGrantRow(index, "stage", value)}
                                                            value={row.stage}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select stage" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {["Proposed", "Sanctioned", "Released", "Utilized", "Closed"].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Grant title"
                                                        onChange={(value) => updateGrantRow(index, "title", value)}
                                                        placeholder="Seed fund or innovation grant title"
                                                        value={row.title}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Scheme name"
                                                        onChange={(value) => updateGrantRow(index, "schemeName", value)}
                                                        placeholder="Scheme or program"
                                                        value={row.schemeName}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Sponsor name"
                                                        onChange={(value) => updateGrantRow(index, "sponsorName", value)}
                                                        placeholder="Funding sponsor"
                                                        value={row.sponsorName}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Beneficiary name"
                                                        onChange={(value) => updateGrantRow(index, "beneficiaryName", value)}
                                                        placeholder="Faculty, team, or startup"
                                                        value={row.beneficiaryName}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Sanctioned amount"
                                                        onChange={(value) => updateGrantRow(index, "sanctionedAmount", value)}
                                                        placeholder="0"
                                                        type="number"
                                                        value={row.sanctionedAmount}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Released amount"
                                                        onChange={(value) => updateGrantRow(index, "releasedAmount", value)}
                                                        placeholder="0"
                                                        type="number"
                                                        value={row.releasedAmount}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Award date"
                                                        onChange={(value) => updateGrantRow(index, "awardDate", value)}
                                                        placeholder=""
                                                        type="date"
                                                        value={row.awardDate}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Document ID"
                                                        onChange={(value) => updateGrantRow(index, "documentId", value)}
                                                        placeholder="Evidence document ID"
                                                        value={row.documentId}
                                                    />
                                                </div>
                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Outcome summary</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) => updateGrantRow(index, "outcomeSummary", event.target.value)}
                                                            rows={3}
                                                            value={row.outcomeSummary}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Follow-up action</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) => updateGrantRow(index, "followUpAction", event.target.value)}
                                                            rows={3}
                                                            value={row.followUpAction}
                                                        />
                                                    </div>
                                                </div>
                                                {canEdit ? (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            onClick={() =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    grants:
                                                                        current.grants.length > 1
                                                                            ? current.grants.filter((_, rowIndex) => rowIndex !== index)
                                                                            : [emptyGrantRow()],
                                                                }))
                                                            }
                                                            type="button"
                                                            variant="ghost"
                                                        >
                                                            Remove row
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                        {canEdit ? (
                                            <Button
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        grants: [...current.grants, emptyGrantRow()],
                                                    }))
                                                }
                                                type="button"
                                                variant="outline"
                                            >
                                                Add grant row
                                            </Button>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Startups and Incubation Outcomes</CardTitle>
                                        <CardDescription>
                                            Track incubated startups, mentoring cases, prototype support, and progression outcomes as structured portfolio records.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.startups.map((row, index) => (
                                            <div
                                                className="rounded-xl border border-zinc-200 p-4"
                                                key={row.id ?? `startup-${index}`}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Startup / incubatee name"
                                                        onChange={(value) => updateStartupRow(index, "startupName", value)}
                                                        placeholder="Startup or incubatee"
                                                        value={row.startupName}
                                                    />
                                                    <div className="space-y-2">
                                                        <Label>Support type</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) => updateStartupRow(index, "supportType", value)}
                                                            value={row.supportType}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select support type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "Incubation",
                                                                    "StartupMentoring",
                                                                    "PrototypeSupport",
                                                                    "PreIncubation",
                                                                    "Acceleration",
                                                                    "TechnologyTransfer",
                                                                ].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Stage</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) => updateStartupRow(index, "stage", value)}
                                                            value={row.stage}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select stage" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {["Ideation", "Validation", "Incubated", "MarketReady", "Graduated"].map((item) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Founder names"
                                                        onChange={(value) => updateStartupRow(index, "founderNames", value)}
                                                        placeholder="Founders or team"
                                                        value={row.founderNames}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Sector"
                                                        onChange={(value) => updateStartupRow(index, "sector", value)}
                                                        placeholder="Sector or domain"
                                                        value={row.sector}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Incubation cell"
                                                        onChange={(value) => updateStartupRow(index, "incubationCell", value)}
                                                        placeholder="IIC / incubator / cell"
                                                        value={row.incubationCell}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Registration number"
                                                        onChange={(value) => updateStartupRow(index, "registrationNumber", value)}
                                                        placeholder="Company or startup registration"
                                                        value={row.registrationNumber}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Support start date"
                                                        onChange={(value) => updateStartupRow(index, "supportStartDate", value)}
                                                        placeholder=""
                                                        type="date"
                                                        value={row.supportStartDate}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Support end date"
                                                        onChange={(value) => updateStartupRow(index, "supportEndDate", value)}
                                                        placeholder=""
                                                        type="date"
                                                        value={row.supportEndDate}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Funding amount"
                                                        onChange={(value) => updateStartupRow(index, "fundingAmount", value)}
                                                        placeholder="0"
                                                        type="number"
                                                        value={row.fundingAmount}
                                                    />
                                                    <FieldInput
                                                        disabled={!canEdit}
                                                        label="Document ID"
                                                        onChange={(value) => updateStartupRow(index, "documentId", value)}
                                                        placeholder="Evidence document ID"
                                                        value={row.documentId}
                                                    />
                                                </div>
                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Outcome summary</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) => updateStartupRow(index, "outcomeSummary", event.target.value)}
                                                            rows={3}
                                                            value={row.outcomeSummary}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Follow-up action</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) => updateStartupRow(index, "followUpAction", event.target.value)}
                                                            rows={3}
                                                            value={row.followUpAction}
                                                        />
                                                    </div>
                                                </div>
                                                {canEdit ? (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            onClick={() =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    startups:
                                                                        current.startups.length > 1
                                                                            ? current.startups.filter((_, rowIndex) => rowIndex !== index)
                                                                            : [emptyStartupRow()],
                                                                }))
                                                            }
                                                            type="button"
                                                            variant="ghost"
                                                        >
                                                            Remove row
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                        {canEdit ? (
                                            <Button
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        startups: [...current.startups, emptyStartupRow()],
                                                    }))
                                                }
                                                type="button"
                                                variant="outline"
                                            >
                                                Add startup row
                                            </Button>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending || !canEdit} onClick={saveDraft} type="button">
                                        Save draft
                                    </Button>
                                    <Button
                                        disabled={isPending || !canEdit}
                                        onClick={submitAssignment}
                                        type="button"
                                        variant="secondary"
                                    >
                                        Submit for review
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function FieldInput({
    label,
    value,
    onChange,
    placeholder,
    disabled,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    type?: string;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                type={type}
                value={value}
            />
        </div>
    );
}
