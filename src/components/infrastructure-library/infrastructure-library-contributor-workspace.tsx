"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DocumentRecord = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    verificationStatus?: string;
};

type FacilityRecord = {
    id: string;
    facilityType: string;
    name: string;
    identifier?: string;
    buildingName?: string;
    quantity?: number;
    capacity?: number;
    areaSqFt?: number;
    ictEnabled: boolean;
    status: string;
    utilizationPercent?: number;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type LibraryResourceRecord = {
    id: string;
    resourceType: string;
    title: string;
    category?: string;
    vendorPublisher?: string;
    accessionNumber?: string;
    isbnIssn?: string;
    copiesCount?: number;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    accessMode: string;
    availabilityStatus: string;
    usageCount?: number;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type UsageRecord = {
    id: string;
    usageType: string;
    title: string;
    periodLabel?: string;
    usageCount?: number;
    satisfactionScore?: number;
    targetGroup?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type MaintenanceRecord = {
    id: string;
    assetCategory: string;
    assetName: string;
    maintenanceType: string;
    vendorName?: string;
    serviceDate?: string;
    nextDueDate?: string;
    status: string;
    costAmount?: number;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
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
        classrooms: number;
        laboratories: number;
        books: number;
        journals: number;
        eResources: number;
        bandwidthMbps: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    infrastructureOverview?: string;
    libraryOverview?: string;
    digitalAccessStrategy?: string;
    maintenanceProtocol?: string;
    utilizationInsights?: string;
    accessibilitySupport?: string;
    greenPractices?: string;
    safetyCompliance?: string;
    studentSupportServices?: string;
    resourceGapActionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    facilities: FacilityRecord[];
    libraryResources: LibraryResourceRecord[];
    usageRows: UsageRecord[];
    maintenanceRows: MaintenanceRecord[];
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
    updatedAt?: string;
    currentStageLabel: string;
};

type FacilityRow = {
    id?: string;
    facilityType: string;
    name: string;
    identifier: string;
    buildingName: string;
    quantity: string;
    capacity: string;
    areaSqFt: string;
    ictEnabled: boolean;
    status: string;
    utilizationPercent: string;
    remarks: string;
    documentId: string;
};

type LibraryResourceRow = {
    id?: string;
    resourceType: string;
    title: string;
    category: string;
    vendorPublisher: string;
    accessionNumber: string;
    isbnIssn: string;
    copiesCount: string;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    accessMode: string;
    availabilityStatus: string;
    usageCount: string;
    remarks: string;
    documentId: string;
};

type UsageRow = {
    id?: string;
    usageType: string;
    title: string;
    periodLabel: string;
    usageCount: string;
    satisfactionScore: string;
    targetGroup: string;
    remarks: string;
    documentId: string;
};

type MaintenanceRow = {
    id?: string;
    assetCategory: string;
    assetName: string;
    maintenanceType: string;
    vendorName: string;
    serviceDate: string;
    nextDueDate: string;
    status: string;
    costAmount: string;
    remarks: string;
    documentId: string;
};

type FormState = {
    infrastructureOverview: string;
    libraryOverview: string;
    digitalAccessStrategy: string;
    maintenanceProtocol: string;
    utilizationInsights: string;
    accessibilitySupport: string;
    greenPractices: string;
    safetyCompliance: string;
    studentSupportServices: string;
    resourceGapActionPlan: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
    facilities: FacilityRow[];
    libraryResources: LibraryResourceRow[];
    usageRows: UsageRow[];
    maintenanceRows: MaintenanceRow[];
};

const narrativeFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "infrastructureOverview", label: "Infrastructure overview", placeholder: "Summarize classrooms, labs, ICT classrooms, campus spaces, and major academic infrastructure readiness." },
    { key: "libraryOverview", label: "Library overview", placeholder: "Describe the library system, collections, subscriptions, automation status, and service model." },
    { key: "digitalAccessStrategy", label: "Digital access strategy", placeholder: "Capture e-resources, remote access, Wi-Fi/bandwidth coverage, LMS or discovery access, and digital inclusion measures." },
    { key: "maintenanceProtocol", label: "Maintenance protocol", placeholder: "Explain preventive/corrective maintenance, AMC coverage, inspections, and escalation standards." },
    { key: "utilizationInsights", label: "Utilization insights", placeholder: "Record footfall, issue-return trends, classroom/lab usage patterns, and peak demand insights." },
    { key: "accessibilitySupport", label: "Accessibility support", placeholder: "Capture ramps, assistive resources, inclusive seating, accessible systems, and disability support coverage." },
    { key: "greenPractices", label: "Green practices", placeholder: "Document energy efficiency, sustainable campus practices, waste systems, and environmental controls." },
    { key: "safetyCompliance", label: "Safety compliance", placeholder: "Explain fire, safety, CCTV, lab safety, stock verification, and statutory compliance controls." },
    { key: "studentSupportServices", label: "Student support services", placeholder: "Describe reading spaces, common rooms, hostels, ICT access, and learning support linked to infrastructure." },
    { key: "resourceGapActionPlan", label: "Resource gap action plan", placeholder: "List identified gaps, prioritization rationale, and the implementation roadmap for upgrades." },
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

function formatDateTime(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusBadge(status: string) {
    if (status === "Approved") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (["Submitted", "Infrastructure Review", "Under Review", "Committee Review"].includes(status)) {
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

function emptyFacilityRow(): FacilityRow {
    return {
        facilityType: "Classroom",
        name: "",
        identifier: "",
        buildingName: "",
        quantity: "",
        capacity: "",
        areaSqFt: "",
        ictEnabled: false,
        status: "Available",
        utilizationPercent: "",
        remarks: "",
        documentId: "",
    };
}

function emptyLibraryResourceRow(): LibraryResourceRow {
    return {
        resourceType: "Book",
        title: "",
        category: "",
        vendorPublisher: "",
        accessionNumber: "",
        isbnIssn: "",
        copiesCount: "",
        subscriptionStartDate: "",
        subscriptionEndDate: "",
        accessMode: "Print",
        availabilityStatus: "Active",
        usageCount: "",
        remarks: "",
        documentId: "",
    };
}

function emptyUsageRow(): UsageRow {
    return {
        usageType: "LibraryFootfall",
        title: "",
        periodLabel: "",
        usageCount: "",
        satisfactionScore: "",
        targetGroup: "",
        remarks: "",
        documentId: "",
    };
}

function emptyMaintenanceRow(): MaintenanceRow {
    return {
        assetCategory: "Facility",
        assetName: "",
        maintenanceType: "Preventive",
        vendorName: "",
        serviceDate: "",
        nextDueDate: "",
        status: "Scheduled",
        costAmount: "",
        remarks: "",
        documentId: "",
    };
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        infrastructureOverview: record.infrastructureOverview ?? "",
        libraryOverview: record.libraryOverview ?? "",
        digitalAccessStrategy: record.digitalAccessStrategy ?? "",
        maintenanceProtocol: record.maintenanceProtocol ?? "",
        utilizationInsights: record.utilizationInsights ?? "",
        accessibilitySupport: record.accessibilitySupport ?? "",
        greenPractices: record.greenPractices ?? "",
        safetyCompliance: record.safetyCompliance ?? "",
        studentSupportServices: record.studentSupportServices ?? "",
        resourceGapActionPlan: record.resourceGapActionPlan ?? "",
        supportingLinks: record.supportingLinks.join("\n"),
        documentIds: record.documentIds.join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        facilities: record.facilities.length
            ? record.facilities.map((row) => ({
                  id: row.id,
                  facilityType: row.facilityType,
                  name: row.name,
                  identifier: row.identifier ?? "",
                  buildingName: row.buildingName ?? "",
                  quantity: row.quantity !== undefined ? String(row.quantity) : "",
                  capacity: row.capacity !== undefined ? String(row.capacity) : "",
                  areaSqFt: row.areaSqFt !== undefined ? String(row.areaSqFt) : "",
                  ictEnabled: row.ictEnabled,
                  status: row.status,
                  utilizationPercent:
                      row.utilizationPercent !== undefined ? String(row.utilizationPercent) : "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyFacilityRow()],
        libraryResources: record.libraryResources.length
            ? record.libraryResources.map((row) => ({
                  id: row.id,
                  resourceType: row.resourceType,
                  title: row.title,
                  category: row.category ?? "",
                  vendorPublisher: row.vendorPublisher ?? "",
                  accessionNumber: row.accessionNumber ?? "",
                  isbnIssn: row.isbnIssn ?? "",
                  copiesCount: row.copiesCount !== undefined ? String(row.copiesCount) : "",
                  subscriptionStartDate: row.subscriptionStartDate ? row.subscriptionStartDate.slice(0, 10) : "",
                  subscriptionEndDate: row.subscriptionEndDate ? row.subscriptionEndDate.slice(0, 10) : "",
                  accessMode: row.accessMode,
                  availabilityStatus: row.availabilityStatus,
                  usageCount: row.usageCount !== undefined ? String(row.usageCount) : "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyLibraryResourceRow()],
        usageRows: record.usageRows.length
            ? record.usageRows.map((row) => ({
                  id: row.id,
                  usageType: row.usageType,
                  title: row.title,
                  periodLabel: row.periodLabel ?? "",
                  usageCount: row.usageCount !== undefined ? String(row.usageCount) : "",
                  satisfactionScore:
                      row.satisfactionScore !== undefined ? String(row.satisfactionScore) : "",
                  targetGroup: row.targetGroup ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyUsageRow()],
        maintenanceRows: record.maintenanceRows.length
            ? record.maintenanceRows.map((row) => ({
                  id: row.id,
                  assetCategory: row.assetCategory,
                  assetName: row.assetName,
                  maintenanceType: row.maintenanceType,
                  vendorName: row.vendorName ?? "",
                  serviceDate: row.serviceDate ? row.serviceDate.slice(0, 10) : "",
                  nextDueDate: row.nextDueDate ? row.nextDueDate.slice(0, 10) : "",
                  status: row.status,
                  costAmount: row.costAmount !== undefined ? String(row.costAmount) : "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyMaintenanceRow()],
    };
}

export function InfrastructureLibraryContributorWorkspace({
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
                  infrastructureOverview: "",
                  libraryOverview: "",
                  digitalAccessStrategy: "",
                  maintenanceProtocol: "",
                  utilizationInsights: "",
                  accessibilitySupport: "",
                  greenPractices: "",
                  safetyCompliance: "",
                  studentSupportServices: "",
                  resourceGapActionPlan: "",
                  supportingLinks: "",
                  documentIds: "",
                  contributorRemarks: "",
                  facilities: [emptyFacilityRow()],
                  libraryResources: [emptyLibraryResourceRow()],
                  usageRows: [emptyUsageRow()],
                  maintenanceRows: [emptyMaintenanceRow()],
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

    function updateFacility(index: number, key: keyof FacilityRow, value: string | boolean) {
        setForm((current) => ({
            ...current,
            facilities: current.facilities.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateLibraryResource(
        index: number,
        key: keyof LibraryResourceRow,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            libraryResources: current.libraryResources.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateUsage(index: number, key: keyof UsageRow, value: string) {
        setForm((current) => ({
            ...current,
            usageRows: current.usageRows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateMaintenance(index: number, key: keyof MaintenanceRow, value: string) {
        setForm((current) => ({
            ...current,
            maintenanceRows: current.maintenanceRows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function buildDraftPayload() {
        return {
            infrastructureOverview: form.infrastructureOverview.trim(),
            libraryOverview: form.libraryOverview.trim(),
            digitalAccessStrategy: form.digitalAccessStrategy.trim(),
            maintenanceProtocol: form.maintenanceProtocol.trim(),
            utilizationInsights: form.utilizationInsights.trim(),
            accessibilitySupport: form.accessibilitySupport.trim(),
            greenPractices: form.greenPractices.trim(),
            safetyCompliance: form.safetyCompliance.trim(),
            studentSupportServices: form.studentSupportServices.trim(),
            resourceGapActionPlan: form.resourceGapActionPlan.trim(),
            supportingLinks: splitLines(form.supportingLinks),
            documentIds: splitCommaValues(form.documentIds),
            contributorRemarks: form.contributorRemarks.trim(),
            facilities: form.facilities
                .filter((row) => row.name.trim())
                .map((row, index) => ({
                    _id: row.id,
                    facilityType: row.facilityType,
                    name: row.name.trim(),
                    identifier: row.identifier.trim(),
                    buildingName: row.buildingName.trim(),
                    quantity: row.quantity.trim() === "" ? undefined : Number(row.quantity),
                    capacity: row.capacity.trim() === "" ? undefined : Number(row.capacity),
                    areaSqFt: row.areaSqFt.trim() === "" ? undefined : Number(row.areaSqFt),
                    ictEnabled: row.ictEnabled,
                    status: row.status,
                    utilizationPercent:
                        row.utilizationPercent.trim() === ""
                            ? undefined
                            : Number(row.utilizationPercent),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            libraryResources: form.libraryResources
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    resourceType: row.resourceType,
                    title: row.title.trim(),
                    category: row.category.trim(),
                    vendorPublisher: row.vendorPublisher.trim(),
                    accessionNumber: row.accessionNumber.trim(),
                    isbnIssn: row.isbnIssn.trim(),
                    copiesCount: row.copiesCount.trim() === "" ? undefined : Number(row.copiesCount),
                    subscriptionStartDate: row.subscriptionStartDate || undefined,
                    subscriptionEndDate: row.subscriptionEndDate || undefined,
                    accessMode: row.accessMode,
                    availabilityStatus: row.availabilityStatus,
                    usageCount: row.usageCount.trim() === "" ? undefined : Number(row.usageCount),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            usageRows: form.usageRows
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    usageType: row.usageType,
                    title: row.title.trim(),
                    periodLabel: row.periodLabel.trim(),
                    usageCount: row.usageCount.trim() === "" ? undefined : Number(row.usageCount),
                    satisfactionScore:
                        row.satisfactionScore.trim() === ""
                            ? undefined
                            : Number(row.satisfactionScore),
                    targetGroup: row.targetGroup.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            maintenanceRows: form.maintenanceRows
                .filter((row) => row.assetName.trim())
                .map((row, index) => ({
                    _id: row.id,
                    assetCategory: row.assetCategory,
                    assetName: row.assetName.trim(),
                    maintenanceType: row.maintenanceType,
                    vendorName: row.vendorName.trim(),
                    serviceDate: row.serviceDate || undefined,
                    nextDueDate: row.nextDueDate || undefined,
                    status: row.status,
                    costAmount: row.costAmount.trim() === "" ? undefined : Number(row.costAmount),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
        };
    }

    async function persistDraft(assignmentId: string) {
        return requestJson<{ message?: string }>(
            `/api/infrastructure-library/assignments/${assignmentId}/contribution`,
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
                    text: data.message ?? "Infrastructure & library draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the infrastructure/library draft.",
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
                    `/api/infrastructure-library/assignments/${selectedAssignment._id}/submit`,
                    { method: "POST" }
                );
                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        "Infrastructure & library assignment submitted successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to submit the infrastructure/library assignment.",
                });
            }
        });
    }

    if (!assignments.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Infrastructure & Library Workspace</CardTitle>
                    <CardDescription>
                        No infrastructure & library assignments are mapped to this account yet.
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
                    <CardTitle>{actorLabel} Infrastructure & Library workspace</CardTitle>
                    <CardDescription>
                        Complete the governed portfolio with structured facility, library, utilization, and maintenance records before sending it into review.
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
                                                <Badge variant="outline">{selectedAssignment.scopeType}</Badge>
                                                <Badge variant="outline">{selectedAssignment.focusArea}</Badge>
                                            </div>
                                            <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                                                {selectedAssignment.planTitle}
                                            </h3>
                                            <p className="mt-2 text-sm text-zinc-600">
                                                {selectedAssignment.unitLabel} · {selectedAssignment.academicYearLabel}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-500">
                                                Due {formatDate(selectedAssignment.dueDate)} · Plan status{" "}
                                                {selectedAssignment.planStatus}
                                            </p>
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            <p>Facilities: {selectedAssignment.facilities.length}</p>
                                            <p>Library resources: {selectedAssignment.libraryResources.length}</p>
                                            <p>Usage rows: {selectedAssignment.usageRows.length}</p>
                                            <p>Maintenance rows: {selectedAssignment.maintenanceRows.length}</p>
                                            <p>Updated: {formatDate(selectedAssignment.updatedAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                                        <MetricCard label="Classrooms target" value={selectedAssignment.planTargets.classrooms} />
                                        <MetricCard label="Laboratories target" value={selectedAssignment.planTargets.laboratories} />
                                        <MetricCard label="Books target" value={selectedAssignment.planTargets.books} />
                                        <MetricCard label="Journals target" value={selectedAssignment.planTargets.journals} />
                                        <MetricCard label="E-resources target" value={selectedAssignment.planTargets.eResources} />
                                        <MetricCard label="Bandwidth target" value={selectedAssignment.planTargets.bandwidthMbps} />
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                                        <p>{selectedAssignment.planSummary?.trim() || "No plan summary provided."}</p>
                                        <p>{selectedAssignment.planStrategyGoals?.trim() || "No strategy goals defined on the plan."}</p>
                                        {selectedAssignment.notes ? (
                                            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-600">
                                                {selectedAssignment.notes}
                                            </p>
                                        ) : null}
                                        {selectedAssignment.reviewRemarks ? (
                                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                                                Latest review note: {selectedAssignment.reviewRemarks}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Narrative and evidence</CardTitle>
                                        <CardDescription>
                                            Capture the qualitative readiness story behind the structured infrastructure and library records.
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
                                                placeholder="Comma separated document IDs"
                                                value={form.documentIds}
                                            />
                                        </div>

                                        {selectedAssignment.documents.length ? (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                {selectedAssignment.documents.map((document) => (
                                                    <EvidenceCard document={document} key={document.id} />
                                                ))}
                                            </div>
                                        ) : null}

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
                                                rows={4}
                                                value={form.contributorRemarks}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <StructuredRowSection
                                    description="Track classrooms, ICT rooms, labs, hostels, library spaces, sports areas, and other physical facilities."
                                    title="Facilities"
                                >
                                    {form.facilities.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "facility"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Facility type" onValueChange={(value) => updateFacility(index, "facilityType", value)} options={["Classroom","ICTClassroom","Laboratory","ResearchFacility","SeminarHall","ComputerCenter","LibrarySpace","Hostel","SportsFacility","CommonFacility","Other"]} value={row.facilityType} />
                                                <TextField disabled={!canEdit} label="Name" onChange={(value) => updateFacility(index, "name", value)} value={row.name} />
                                                <TextField disabled={!canEdit} label="Identifier" onChange={(value) => updateFacility(index, "identifier", value)} value={row.identifier} />
                                                <TextField disabled={!canEdit} label="Building" onChange={(value) => updateFacility(index, "buildingName", value)} value={row.buildingName} />
                                                <TextField disabled={!canEdit} label="Quantity" onChange={(value) => updateFacility(index, "quantity", value)} type="number" value={row.quantity} />
                                                <TextField disabled={!canEdit} label="Capacity" onChange={(value) => updateFacility(index, "capacity", value)} type="number" value={row.capacity} />
                                                <TextField disabled={!canEdit} label="Area (sq ft)" onChange={(value) => updateFacility(index, "areaSqFt", value)} type="number" value={row.areaSqFt} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateFacility(index, "status", value)} options={["Available","UnderMaintenance","Planned","Shared"]} value={row.status} />
                                                <TextField disabled={!canEdit} label="Utilization %" onChange={(value) => updateFacility(index, "utilizationPercent", value)} type="number" value={row.utilizationPercent} />
                                                <SelectField disabled={!canEdit} label="ICT enabled" onValueChange={(value) => updateFacility(index, "ictEnabled", value === "yes")} options={["yes","no"]} value={row.ictEnabled ? "yes" : "no"} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateFacility(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateFacility(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, facilities: [...current.facilities, emptyFacilityRow()] }))} onRemove={() => setForm((current) => ({ ...current, facilities: current.facilities.length > 1 ? current.facilities.filter((_, rowIndex) => rowIndex !== index) : [emptyFacilityRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Capture books, journals, databases, e-resources, and other library holdings with subscription and usage context."
                                    title="Library Resources"
                                >
                                    {form.libraryResources.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "resource"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Resource type" onValueChange={(value) => updateLibraryResource(index, "resourceType", value)} options={["Book","Journal","EResource","Database","Thesis","Multimedia","Newspaper","RareCollection","Other"]} value={row.resourceType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateLibraryResource(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Category" onChange={(value) => updateLibraryResource(index, "category", value)} value={row.category} />
                                                <TextField disabled={!canEdit} label="Vendor / publisher" onChange={(value) => updateLibraryResource(index, "vendorPublisher", value)} value={row.vendorPublisher} />
                                                <TextField disabled={!canEdit} label="Accession number" onChange={(value) => updateLibraryResource(index, "accessionNumber", value)} value={row.accessionNumber} />
                                                <TextField disabled={!canEdit} label="ISBN / ISSN" onChange={(value) => updateLibraryResource(index, "isbnIssn", value)} value={row.isbnIssn} />
                                                <TextField disabled={!canEdit} label="Copies" onChange={(value) => updateLibraryResource(index, "copiesCount", value)} type="number" value={row.copiesCount} />
                                                <TextField disabled={!canEdit} label="Subscription start" onChange={(value) => updateLibraryResource(index, "subscriptionStartDate", value)} type="date" value={row.subscriptionStartDate} />
                                                <TextField disabled={!canEdit} label="Subscription end" onChange={(value) => updateLibraryResource(index, "subscriptionEndDate", value)} type="date" value={row.subscriptionEndDate} />
                                                <SelectField disabled={!canEdit} label="Access mode" onValueChange={(value) => updateLibraryResource(index, "accessMode", value)} options={["Print","Digital","Hybrid"]} value={row.accessMode} />
                                                <SelectField disabled={!canEdit} label="Availability" onValueChange={(value) => updateLibraryResource(index, "availabilityStatus", value)} options={["Active","Expired","Archived","Planned"]} value={row.availabilityStatus} />
                                                <TextField disabled={!canEdit} label="Usage count" onChange={(value) => updateLibraryResource(index, "usageCount", value)} type="number" value={row.usageCount} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateLibraryResource(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateLibraryResource(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, libraryResources: [...current.libraryResources, emptyLibraryResourceRow()] }))} onRemove={() => setForm((current) => ({ ...current, libraryResources: current.libraryResources.length > 1 ? current.libraryResources.filter((_, rowIndex) => rowIndex !== index) : [emptyLibraryResourceRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Capture classroom utilization, library footfall, issue-return metrics, and digital resource usage snapshots."
                                    title="Usage Analytics"
                                >
                                    {form.usageRows.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "usage"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Usage type" onValueChange={(value) => updateUsage(index, "usageType", value)} options={["ClassroomUtilization","ResearchFacilityUtilization","LibraryFootfall","LibraryIssueReturn","DigitalResourceUsage","AutomationUsage","Other"]} value={row.usageType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateUsage(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Period label" onChange={(value) => updateUsage(index, "periodLabel", value)} value={row.periodLabel} />
                                                <TextField disabled={!canEdit} label="Usage count" onChange={(value) => updateUsage(index, "usageCount", value)} type="number" value={row.usageCount} />
                                                <TextField disabled={!canEdit} label="Satisfaction score (0-5)" onChange={(value) => updateUsage(index, "satisfactionScore", value)} type="number" value={row.satisfactionScore} />
                                                <TextField disabled={!canEdit} label="Target group" onChange={(value) => updateUsage(index, "targetGroup", value)} value={row.targetGroup} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateUsage(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateUsage(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, usageRows: [...current.usageRows, emptyUsageRow()] }))} onRemove={() => setForm((current) => ({ ...current, usageRows: current.usageRows.length > 1 ? current.usageRows.filter((_, rowIndex) => rowIndex !== index) : [emptyUsageRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Track preventive/corrective maintenance, upgrades, AMCs, inspections, and costs for facilities and library systems."
                                    title="Maintenance Records"
                                >
                                    {form.maintenanceRows.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "maintenance"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Asset category" onValueChange={(value) => updateMaintenance(index, "assetCategory", value)} options={["Facility","Library","ICT","Equipment","Civil","Electrical","Safety","Other"]} value={row.assetCategory} />
                                                <TextField disabled={!canEdit} label="Asset name" onChange={(value) => updateMaintenance(index, "assetName", value)} value={row.assetName} />
                                                <SelectField disabled={!canEdit} label="Maintenance type" onValueChange={(value) => updateMaintenance(index, "maintenanceType", value)} options={["Preventive","Corrective","AMC","Calibration","Upgrade","Renovation","Inspection"]} value={row.maintenanceType} />
                                                <TextField disabled={!canEdit} label="Vendor" onChange={(value) => updateMaintenance(index, "vendorName", value)} value={row.vendorName} />
                                                <TextField disabled={!canEdit} label="Service date" onChange={(value) => updateMaintenance(index, "serviceDate", value)} type="date" value={row.serviceDate} />
                                                <TextField disabled={!canEdit} label="Next due date" onChange={(value) => updateMaintenance(index, "nextDueDate", value)} type="date" value={row.nextDueDate} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateMaintenance(index, "status", value)} options={["Scheduled","Ongoing","Completed","Deferred"]} value={row.status} />
                                                <TextField disabled={!canEdit} label="Cost amount" onChange={(value) => updateMaintenance(index, "costAmount", value)} type="number" value={row.costAmount} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateMaintenance(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateMaintenance(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, maintenanceRows: [...current.maintenanceRows, emptyMaintenanceRow()] }))} onRemove={() => setForm((current) => ({ ...current, maintenanceRows: current.maintenanceRows.length > 1 ? current.maintenanceRows.filter((_, rowIndex) => rowIndex !== index) : [emptyMaintenanceRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Workflow history</CardTitle>
                                        <CardDescription>
                                            Past review and workflow movements on this governed portfolio file.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-zinc-950">Review history</p>
                                            {selectedAssignment.reviewHistory.length ? (
                                                selectedAssignment.reviewHistory.map((entry, index) => (
                                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.stage}-${index}`}>
                                                        <p className="text-sm font-semibold text-zinc-950">{entry.stage}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {[entry.reviewerName, entry.reviewerRole, entry.decision]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-600">
                                                            {entry.remarks?.trim() || "No remarks captured."}
                                                        </p>
                                                        <p className="mt-2 text-xs text-zinc-500">
                                                            {formatDateTime(entry.reviewedAt)}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                                    No review entries recorded yet.
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-zinc-950">Status log</p>
                                            {selectedAssignment.statusLogs.length ? (
                                                selectedAssignment.statusLogs.map((entry, index) => (
                                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.status}-${index}`}>
                                                        <p className="text-sm font-semibold text-zinc-950">{entry.status}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {[entry.actorName, entry.actorRole].filter(Boolean).join(" · ")}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-600">
                                                            {entry.remarks?.trim() || "No remarks captured."}
                                                        </p>
                                                        <p className="mt-2 text-xs text-zinc-500">
                                                            {formatDateTime(entry.changedAt)}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                                    No workflow status entries recorded yet.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={!canEdit || isPending} onClick={saveDraft} type="button">
                                        Save draft
                                    </Button>
                                    <Button disabled={!canEdit || isPending} onClick={submitAssignment} type="button">
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
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function StructuredRowSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = "text",
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input disabled={disabled} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
        </div>
    );
}

function SelectField({
    label,
    value,
    onValueChange,
    options,
    disabled,
}: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select disabled={disabled} onValueChange={onValueChange} value={value}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function RowActions({
    canEdit,
    onAdd,
    onRemove,
}: {
    canEdit: boolean;
    onAdd: () => void;
    onRemove: () => void;
}) {
    if (!canEdit) {
        return null;
    }

    return (
        <div className="flex gap-3">
            <Button onClick={onAdd} type="button" variant="secondary">
                Add row
            </Button>
            <Button onClick={onRemove} type="button" variant="outline">
                Remove row
            </Button>
        </div>
    );
}

function EvidenceCard({ document }: { document: DocumentRecord }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            {document.fileUrl ? (
                <a
                    className="text-sm font-semibold text-zinc-950 underline"
                    href={document.fileUrl}
                    rel="noreferrer"
                    target="_blank"
                >
                    {document.fileName || document.id}
                </a>
            ) : (
                <p className="text-sm font-semibold text-zinc-950">{document.fileName || document.id}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
                {document.verificationStatus || "Verification pending"}
            </p>
        </div>
    );
}
