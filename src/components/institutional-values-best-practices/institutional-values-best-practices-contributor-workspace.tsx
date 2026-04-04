"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

type AssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    scopeType: string;
    theme: string;
    unitLabel: string;
    planStatus: string;
    planOverview?: string;
    planStrategicPriorities?: string;
    planTargets: {
        environmentalRecords: number;
        inclusionRecords: number;
        ethicsRecords: number;
        outreachPrograms: number;
        bestPractices: number;
        distinctivenessNarratives: number;
        audits: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    environmentalSustainabilityNarrative?: string;
    inclusivenessNarrative?: string;
    humanValuesNarrative?: string;
    communityOutreachNarrative?: string;
    bestPracticesNarrative?: string;
    institutionalDistinctivenessNarrative?: string;
    sustainabilityAuditNarrative?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    greenCampusInitiatives: Array<Record<string, any>>;
    environmentalResourceRecords: Array<Record<string, any>>;
    energyConsumptionRecords: Array<Record<string, any>>;
    waterManagementSystems: Array<Record<string, any>>;
    wasteManagementPractices: Array<Record<string, any>>;
    genderEquityPrograms: Array<Record<string, any>>;
    inclusivenessFacilities: Array<Record<string, any>>;
    ethicsPrograms: Array<Record<string, any>>;
    codeOfConductRecords: Array<Record<string, any>>;
    communityOutreachPrograms: Array<Record<string, any>>;
    outreachParticipants: Array<Record<string, any>>;
    institutionalBestPractices: Array<Record<string, any>>;
    institutionalDistinctivenessEntries: Array<Record<string, any>>;
    sustainabilityAudits: Array<Record<string, any>>;
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

type RowState = { id?: string } & Record<string, string>;

type FormState = {
    environmentalSustainabilityNarrative: string;
    inclusivenessNarrative: string;
    humanValuesNarrative: string;
    communityOutreachNarrative: string;
    bestPracticesNarrative: string;
    institutionalDistinctivenessNarrative: string;
    sustainabilityAuditNarrative: string;
    actionPlan: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
    greenCampusInitiatives: RowState[];
    environmentalResourceRecords: RowState[];
    energyConsumptionRecords: RowState[];
    waterManagementSystems: RowState[];
    wasteManagementPractices: RowState[];
    genderEquityPrograms: RowState[];
    inclusivenessFacilities: RowState[];
    ethicsPrograms: RowState[];
    codeOfConductRecords: RowState[];
    communityOutreachPrograms: RowState[];
    outreachParticipants: RowState[];
    institutionalBestPractices: RowState[];
    institutionalDistinctivenessEntries: RowState[];
    sustainabilityAudits: RowState[];
};

type FieldConfig = {
    key: string;
    label: string;
    type?: "text" | "number" | "date" | "textarea" | "select";
    options?: string[];
};

type SectionConfig = {
    key: keyof Pick<
        FormState,
        | "greenCampusInitiatives"
        | "environmentalResourceRecords"
        | "energyConsumptionRecords"
        | "waterManagementSystems"
        | "wasteManagementPractices"
        | "genderEquityPrograms"
        | "inclusivenessFacilities"
        | "ethicsPrograms"
        | "codeOfConductRecords"
        | "communityOutreachPrograms"
        | "outreachParticipants"
        | "institutionalBestPractices"
        | "institutionalDistinctivenessEntries"
        | "sustainabilityAudits"
    >;
    label: string;
    description: string;
    fields: FieldConfig[];
    emptyRow: () => RowState;
};

const narrativeFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    {
        key: "environmentalSustainabilityNarrative",
        label: "Environmental sustainability narrative",
        placeholder:
            "Explain green campus priorities, energy conservation, water stewardship, waste handling, and sustainability culture.",
    },
    {
        key: "inclusivenessNarrative",
        label: "Inclusiveness narrative",
        placeholder:
            "Capture gender equity, accessible facilities, safety, participation, and support for inclusive campus experience.",
    },
    {
        key: "humanValuesNarrative",
        label: "Human values and ethics narrative",
        placeholder:
            "Describe ethics orientation, constitutional values, code-of-conduct communication, and stakeholder compliance practices.",
    },
    {
        key: "communityOutreachNarrative",
        label: "Community outreach narrative",
        placeholder:
            "Summarize extension activities, beneficiaries reached, student participation, and measurable social responsibility outcomes.",
    },
    {
        key: "bestPracticesNarrative",
        label: "Institutional best practices narrative",
        placeholder:
            "Record the institution's showcased best practices, why they matter, how they operate, and what evidence proves success.",
    },
    {
        key: "institutionalDistinctivenessNarrative",
        label: "Institutional distinctiveness narrative",
        placeholder:
            "Explain the institution's unique identity, differentiators, and impact on learners and society.",
    },
    {
        key: "sustainabilityAuditNarrative",
        label: "Sustainability audits and certifications narrative",
        placeholder:
            "Capture audit coverage, findings, agencies, certifications, recommendations, and follow-through.",
    },
    {
        key: "actionPlan",
        label: "Action plan",
        placeholder:
            "List unresolved gaps, audit follow-ups, ownership, deadlines, and next-cycle improvement priorities.",
    },
];

const sectionConfigs: SectionConfig[] = [
    {
        key: "greenCampusInitiatives",
        label: "Green campus initiatives",
        description: "Track structured green-campus actions and implementation evidence.",
        fields: [
            { key: "initiativeType", label: "Initiative type", type: "select", options: ["TreePlantation", "SolarEnergy", "RainwaterHarvesting", "GreenAuditAwareness", "PlasticFreeCampus", "EnergyConservation", "CleanCampusDrive", "Other"] },
            { key: "title", label: "Title" },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
            { key: "status", label: "Status", type: "select", options: ["Planned", "InProgress", "Completed", "Continuous"] },
            { key: "impactDescription", label: "Impact", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            initiativeType: "TreePlantation",
            title: "",
            startDate: "",
            endDate: "",
            status: "Planned",
            impactDescription: "",
            documentId: "",
        }),
    },
    {
        key: "energyConsumptionRecords",
        label: "Energy consumption records",
        description: "Capture energy-source-wise consumption and cost records for green audit analytics.",
        fields: [
            { key: "energySource", label: "Energy source", type: "select", options: ["Electricity", "Solar", "Generator", "Other"] },
            { key: "recordedMonth", label: "Recorded month" },
            { key: "unitsConsumed", label: "Units consumed", type: "number" },
            { key: "costIncurred", label: "Cost incurred", type: "number" },
            { key: "academicYearId", label: "Academic year ID" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            energySource: "Electricity",
            recordedMonth: "",
            unitsConsumed: "",
            costIncurred: "",
            academicYearId: "",
            documentId: "",
        }),
    },
    {
        key: "waterManagementSystems",
        label: "Water management systems",
        description: "Capture rainwater harvesting, recycling, and other water-management infrastructure.",
        fields: [
            { key: "systemType", label: "System type", type: "select", options: ["RainwaterHarvesting", "Recycling", "Reuse", "TreatmentPlant", "Other"] },
            { key: "installationYear", label: "Installation year", type: "number" },
            { key: "capacityLiters", label: "Capacity liters", type: "number" },
            { key: "methodology", label: "Methodology", type: "textarea" },
            { key: "status", label: "Status", type: "select", options: ["Active", "Planned", "Completed", "UnderMaintenance", "Inactive"] },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            systemType: "RainwaterHarvesting",
            installationYear: "",
            capacityLiters: "",
            methodology: "",
            status: "Active",
            documentId: "",
        }),
    },
    {
        key: "wasteManagementPractices",
        label: "Waste management practices",
        description: "Capture solid, liquid, and e-waste management practices with implementation impact.",
        fields: [
            { key: "practiceType", label: "Practice type", type: "select", options: ["Solid", "Liquid", "EWaste", "Biomedical", "Other"] },
            { key: "implementedDate", label: "Implemented date", type: "date" },
            { key: "methodology", label: "Methodology", type: "textarea" },
            { key: "impactSummary", label: "Impact summary", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            practiceType: "Solid",
            implementedDate: "",
            methodology: "",
            impactSummary: "",
            documentId: "",
        }),
    },
    {
        key: "genderEquityPrograms",
        label: "Gender equity programs",
        description: "Capture awareness, workshops, and campus-safety oriented programs.",
        fields: [
            { key: "programType", label: "Program type", type: "select", options: ["Awareness", "Workshop", "SafetyTraining", "Sensitization", "Counselling", "Other"] },
            { key: "title", label: "Title" },
            { key: "conductedDate", label: "Conducted date", type: "date" },
            { key: "participantsCount", label: "Participants", type: "number" },
            { key: "impactNotes", label: "Impact notes", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            programType: "Awareness",
            title: "",
            conductedDate: "",
            participantsCount: "",
            impactNotes: "",
            documentId: "",
        }),
    },
    {
        key: "inclusivenessFacilities",
        label: "Facilities for Divyangjan",
        description: "Track accessibility infrastructure and inclusive campus facilities.",
        fields: [
            { key: "facilityType", label: "Facility type", type: "select", options: ["Ramp", "Lift", "BrailleSignage", "ScribeSupport", "AccessibleWashroom", "Other"] },
            { key: "locationDescription", label: "Location" },
            { key: "establishedYear", label: "Established year", type: "number" },
            { key: "status", label: "Status", type: "select", options: ["Active", "Planned", "UnderMaintenance", "Inactive"] },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            facilityType: "Ramp",
            locationDescription: "",
            establishedYear: "",
            status: "Active",
            documentId: "",
        }),
    },
    {
        key: "ethicsPrograms",
        label: "Human values and ethics programs",
        description: "Capture ethics and constitutional-values programmes conducted for stakeholders.",
        fields: [
            { key: "title", label: "Title" },
            { key: "programCategory", label: "Category", type: "select", options: ["ProfessionalEthics", "ConstitutionalValues", "HumanValues", "CodeOfConduct", "Other"] },
            { key: "programDate", label: "Program date", type: "date" },
            { key: "targetAudience", label: "Target audience" },
            { key: "stakeholderType", label: "Stakeholder type", type: "select", options: ["Student", "Faculty", "Admin", "All"] },
            { key: "status", label: "Status", type: "select", options: ["Active", "Planned", "Reviewed", "Archived"] },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            title: "",
            programCategory: "ProfessionalEthics",
            programDate: "",
            targetAudience: "",
            stakeholderType: "All",
            status: "Active",
            documentId: "",
        }),
    },
    {
        key: "codeOfConductRecords",
        label: "Code of conduct records",
        description: "Capture stakeholder-wise code-of-conduct records with policy evidence and review cycle.",
        fields: [
            { key: "title", label: "Title" },
            { key: "stakeholderType", label: "Stakeholder type", type: "select", options: ["Student", "Faculty", "Admin", "All"] },
            { key: "effectiveDate", label: "Effective date", type: "date" },
            { key: "reviewCycleYears", label: "Review cycle (years)", type: "number" },
            { key: "status", label: "Status", type: "select", options: ["Active", "Planned", "Reviewed", "Archived"] },
            { key: "policyDocumentId", label: "Policy document ID" },
        ],
        emptyRow: () => ({
            title: "",
            stakeholderType: "All",
            effectiveDate: "",
            reviewCycleYears: "",
            status: "Active",
            policyDocumentId: "",
        }),
    },
    {
        key: "communityOutreachPrograms",
        label: "Community outreach and social responsibility",
        description: "Track outreach programs and beneficiary impact.",
        fields: [
            { key: "activityType", label: "Activity type", type: "select", options: ["VillageAdoption", "HealthCamp", "CleanlinessDrive", "AwarenessDrive", "NSSExtension", "CSRInitiative", "Other"] },
            { key: "title", label: "Title" },
            { key: "location", label: "Location" },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
            { key: "beneficiariesCount", label: "Beneficiaries", type: "number" },
            { key: "impactSummary", label: "Impact summary", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            activityType: "VillageAdoption",
            title: "",
            location: "",
            startDate: "",
            endDate: "",
            beneficiariesCount: "",
            impactSummary: "",
            documentId: "",
        }),
    },
    {
        key: "outreachParticipants",
        label: "Outreach participants",
        description: "Track participant-wise outreach involvement linked to the outreach program rows above.",
        fields: [
            { key: "programDisplayOrder", label: "Outreach program row", type: "select", options: [] },
            { key: "participantType", label: "Participant type", type: "select", options: ["Student", "Faculty", "Staff"] },
            { key: "participantId", label: "Participant ID" },
            { key: "participantName", label: "Participant name" },
            { key: "hoursContributed", label: "Hours contributed", type: "number" },
            { key: "certificateDocumentId", label: "Certificate document ID" },
        ],
        emptyRow: () => ({
            programDisplayOrder: "1",
            participantType: "Student",
            participantId: "",
            participantName: "",
            hoursContributed: "",
            certificateDocumentId: "",
        }),
    },
    {
        key: "institutionalBestPractices",
        label: "Institutional best practices",
        description: "Document the formal NAAC best-practice narratives with success evidence.",
        fields: [
            { key: "practiceTitle", label: "Practice title" },
            { key: "objectives", label: "Objectives", type: "textarea" },
            { key: "context", label: "Context", type: "textarea" },
            { key: "implementationDetails", label: "Implementation details", type: "textarea" },
            { key: "evidenceOfSuccess", label: "Evidence of success", type: "textarea" },
            { key: "problemsEncountered", label: "Problems encountered", type: "textarea" },
            { key: "resourcesRequired", label: "Resources required", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            practiceTitle: "",
            objectives: "",
            context: "",
            implementationDetails: "",
            evidenceOfSuccess: "",
            problemsEncountered: "",
            resourcesRequired: "",
            documentId: "",
        }),
    },
    {
        key: "institutionalDistinctivenessEntries",
        label: "Institutional distinctiveness",
        description: "Capture the distinctive feature narratives that differentiate the institution.",
        fields: [
            { key: "distinctFeatureTitle", label: "Distinct feature title" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "impactOnStudents", label: "Impact on students", type: "textarea" },
            { key: "societalImpact", label: "Societal impact", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            distinctFeatureTitle: "",
            description: "",
            impactOnStudents: "",
            societalImpact: "",
            documentId: "",
        }),
    },
    {
        key: "sustainabilityAudits",
        label: "Sustainability audits and certifications",
        description: "Track green, energy, and environmental audits along with agencies and recommendations.",
        fields: [
            { key: "auditType", label: "Audit type", type: "select", options: ["GreenAudit", "EnergyAudit", "EnvironmentAudit", "Other"] },
            { key: "auditAgency", label: "Audit agency" },
            { key: "auditYear", label: "Audit year", type: "number" },
            { key: "auditScore", label: "Audit score", type: "number" },
            { key: "recommendations", label: "Recommendations", type: "textarea" },
            { key: "documentId", label: "Document ID" },
        ],
        emptyRow: () => ({
            auditType: "GreenAudit",
            auditAgency: "",
            auditYear: "",
            auditScore: "",
            recommendations: "",
            documentId: "",
        }),
    },
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

    if (["Submitted", "IQAC Review", "Leadership Review", "Governance Review"].includes(status)) {
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

function mapRow(record: Record<string, any>, fields: FieldConfig[]) {
    return fields.reduce<RowState>(
        (accumulator, field) => {
            const rawValue = record[field.key];
            accumulator[field.key] =
                rawValue === null || rawValue === undefined
                    ? ""
                    : field.type === "date" && typeof rawValue === "string"
                      ? rawValue.slice(0, 10)
                      : String(rawValue);
            return accumulator;
        },
        { id: record.id }
    );
}

function buildInitialForm(record: AssignmentRecord): FormState {
    const result = {
        environmentalSustainabilityNarrative: record.environmentalSustainabilityNarrative ?? "",
        inclusivenessNarrative: record.inclusivenessNarrative ?? "",
        humanValuesNarrative: record.humanValuesNarrative ?? "",
        communityOutreachNarrative: record.communityOutreachNarrative ?? "",
        bestPracticesNarrative: record.bestPracticesNarrative ?? "",
        institutionalDistinctivenessNarrative:
            record.institutionalDistinctivenessNarrative ?? "",
        sustainabilityAuditNarrative: record.sustainabilityAuditNarrative ?? "",
        actionPlan: record.actionPlan ?? "",
        supportingLinks: record.supportingLinks.join("\n"),
        documentIds: record.documentIds.join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        greenCampusInitiatives: [] as RowState[],
        environmentalResourceRecords: [] as RowState[],
        energyConsumptionRecords: [] as RowState[],
        waterManagementSystems: [] as RowState[],
        wasteManagementPractices: [] as RowState[],
        genderEquityPrograms: [] as RowState[],
        inclusivenessFacilities: [] as RowState[],
        ethicsPrograms: [] as RowState[],
        codeOfConductRecords: [] as RowState[],
        communityOutreachPrograms: [] as RowState[],
        outreachParticipants: [] as RowState[],
        institutionalBestPractices: [] as RowState[],
        institutionalDistinctivenessEntries: [] as RowState[],
        sustainabilityAudits: [] as RowState[],
    };

    for (const section of sectionConfigs) {
        const sourceRows = Array.isArray(record[section.key]) ? record[section.key] : [];
        result[section.key] = sourceRows.length
            ? sourceRows.map((row: Record<string, any>) => mapRow(row, section.fields))
            : [section.emptyRow()];
    }

    return result;
}

function emptyForm(): FormState {
    return {
        environmentalSustainabilityNarrative: "",
        inclusivenessNarrative: "",
        humanValuesNarrative: "",
        communityOutreachNarrative: "",
        bestPracticesNarrative: "",
        institutionalDistinctivenessNarrative: "",
        sustainabilityAuditNarrative: "",
        actionPlan: "",
        supportingLinks: "",
        documentIds: "",
        contributorRemarks: "",
        greenCampusInitiatives: [sectionConfigs[0].emptyRow()],
        environmentalResourceRecords: [],
        energyConsumptionRecords: [sectionConfigs[1].emptyRow()],
        waterManagementSystems: [sectionConfigs[2].emptyRow()],
        wasteManagementPractices: [sectionConfigs[3].emptyRow()],
        genderEquityPrograms: [sectionConfigs[4].emptyRow()],
        inclusivenessFacilities: [sectionConfigs[5].emptyRow()],
        ethicsPrograms: [sectionConfigs[6].emptyRow()],
        codeOfConductRecords: [sectionConfigs[7].emptyRow()],
        communityOutreachPrograms: [sectionConfigs[8].emptyRow()],
        outreachParticipants: [sectionConfigs[9].emptyRow()],
        institutionalBestPractices: [sectionConfigs[10].emptyRow()],
        institutionalDistinctivenessEntries: [sectionConfigs[11].emptyRow()],
        sustainabilityAudits: [sectionConfigs[12].emptyRow()],
    };
}

export function InstitutionalValuesBestPracticesContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [form, setForm] = useState<FormState>(assignments[0] ? buildInitialForm(assignments[0]) : emptyForm());
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const selectedAssignment =
        useMemo(
            () => assignments.find((assignment) => assignment._id === selectedId) ?? assignments[0] ?? null,
            [assignments, selectedId]
        );

    useEffect(() => {
        if (selectedAssignment) {
            setForm(buildInitialForm(selectedAssignment));
        }
    }, [selectedAssignment?._id]);

    function updateNarrative(key: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function addRow(section: SectionConfig) {
        setForm((current) => ({
            ...current,
            [section.key]: [...current[section.key], section.emptyRow()],
        }));
    }

    function removeRow(section: SectionConfig, index: number) {
        setForm((current) => {
            const nextRows = current[section.key].filter((_, rowIndex) => rowIndex !== index);
            return {
                ...current,
                [section.key]: nextRows.length ? nextRows : [section.emptyRow()],
            };
        });
    }

    function updateRow(
        section: SectionConfig,
        index: number,
        fieldKey: string,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            [section.key]: current[section.key].map((row, rowIndex) =>
                rowIndex === index ? { ...row, [fieldKey]: value } : row
            ),
        }));
    }

    function serializeRows(rows: RowState[]) {
        return rows
            .map((row, index) => ({
                ...(row.id ? { _id: row.id } : {}),
                ...Object.fromEntries(
                    Object.entries(row).filter(([key, value]) => key !== "id" && String(value).trim() !== "")
                ),
                displayOrder: index + 1,
            }))
            .filter((row) => Object.keys(row).length > 1);
    }

    function saveDraft() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const payload = {
                    environmentalSustainabilityNarrative: form.environmentalSustainabilityNarrative.trim(),
                    inclusivenessNarrative: form.inclusivenessNarrative.trim(),
                    humanValuesNarrative: form.humanValuesNarrative.trim(),
                    communityOutreachNarrative: form.communityOutreachNarrative.trim(),
                    bestPracticesNarrative: form.bestPracticesNarrative.trim(),
                    institutionalDistinctivenessNarrative:
                        form.institutionalDistinctivenessNarrative.trim(),
                    sustainabilityAuditNarrative: form.sustainabilityAuditNarrative.trim(),
                    actionPlan: form.actionPlan.trim(),
                    supportingLinks: splitLines(form.supportingLinks),
                    documentIds: splitCommaValues(form.documentIds),
                    contributorRemarks: form.contributorRemarks.trim(),
                    greenCampusInitiatives: serializeRows(form.greenCampusInitiatives),
                    environmentalResourceRecords: serializeRows(form.environmentalResourceRecords),
                    energyConsumptionRecords: serializeRows(form.energyConsumptionRecords),
                    waterManagementSystems: serializeRows(form.waterManagementSystems),
                    wasteManagementPractices: serializeRows(form.wasteManagementPractices),
                    genderEquityPrograms: serializeRows(form.genderEquityPrograms),
                    inclusivenessFacilities: serializeRows(form.inclusivenessFacilities),
                    ethicsPrograms: serializeRows(form.ethicsPrograms),
                    codeOfConductRecords: serializeRows(form.codeOfConductRecords),
                    communityOutreachPrograms: serializeRows(form.communityOutreachPrograms),
                    outreachParticipants: serializeRows(form.outreachParticipants),
                    institutionalBestPractices: serializeRows(form.institutionalBestPractices),
                    institutionalDistinctivenessEntries: serializeRows(
                        form.institutionalDistinctivenessEntries
                    ),
                    sustainabilityAudits: serializeRows(form.sustainabilityAudits),
                };

                const data = await requestJson<{ message?: string }>(
                    `/api/institutional-values-best-practices/assignments/${selectedAssignment._id}/contribution`,
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error ? error.message : "Unable to save the draft.",
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
                const data = await requestJson<{ message?: string }>(
                    `/api/institutional-values-best-practices/assignments/${selectedAssignment._id}/submit`,
                    {
                        method: "POST",
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Record submitted for review.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error ? error.message : "Unable to submit the record.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
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
                    {assignments.length ? (
                        assignments.map((assignment) => {
                            const active = assignment._id === selectedAssignment?._id;

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
                                                {assignment.theme}
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
                        })
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No assignments are currently mapped to your account.
                        </div>
                    )}
                </div>

                {selectedAssignment ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>{selectedAssignment.planTitle}</CardTitle>
                                        <CardDescription>
                                            {selectedAssignment.unitLabel} · {selectedAssignment.academicYearLabel} ·{" "}
                                            {actorLabel}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {statusBadge(selectedAssignment.status)}
                                        <Badge variant="secondary">{selectedAssignment.planStatus}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-zinc-600">
                                {selectedAssignment.planOverview ? (
                                    <p>{selectedAssignment.planOverview}</p>
                                ) : null}
                                {selectedAssignment.planStrategicPriorities ? (
                                    <p>{selectedAssignment.planStrategicPriorities}</p>
                                ) : null}
                                <p>
                                    Targets: Env {selectedAssignment.planTargets.environmentalRecords} · Inclusion{" "}
                                    {selectedAssignment.planTargets.inclusionRecords} · Ethics{" "}
                                    {selectedAssignment.planTargets.ethicsRecords} · Outreach{" "}
                                    {selectedAssignment.planTargets.outreachPrograms} · Best Practices{" "}
                                    {selectedAssignment.planTargets.bestPractices} · Distinctiveness{" "}
                                    {selectedAssignment.planTargets.distinctivenessNarratives} · Audits{" "}
                                    {selectedAssignment.planTargets.audits}
                                </p>
                                <p>
                                    Due: {formatDate(selectedAssignment.dueDate)}{" "}
                                    {selectedAssignment.notes ? `· ${selectedAssignment.notes}` : ""}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Narratives and evidence</CardTitle>
                                <CardDescription>
                                    Complete the qualitative Criteria 7 sections and attach structured records with evidence.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {narrativeFields.map((field) => (
                                    <div className="space-y-2" key={field.key}>
                                        <Label>{field.label}</Label>
                                        <Textarea
                                            className="min-h-28"
                                            onChange={(event) => updateNarrative(field.key, event.target.value)}
                                            placeholder={field.placeholder}
                                            value={String(form[field.key] ?? "")}
                                        />
                                    </div>
                                ))}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Supporting links</Label>
                                        <Textarea
                                            className="min-h-24"
                                            onChange={(event) =>
                                                updateNarrative("supportingLinks", event.target.value)
                                            }
                                            placeholder="One URL per line"
                                            value={form.supportingLinks}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Manual document IDs</Label>
                                        <Textarea
                                            className="min-h-24"
                                            onChange={(event) =>
                                                updateNarrative("documentIds", event.target.value)
                                            }
                                            placeholder="Comma-separated document IDs"
                                            value={form.documentIds}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Contributor remarks</Label>
                                    <Textarea
                                        className="min-h-20"
                                        onChange={(event) =>
                                            updateNarrative("contributorRemarks", event.target.value)
                                        }
                                        placeholder="Add context for reviewers, missing evidence notes, or dependencies."
                                        value={form.contributorRemarks}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {sectionConfigs.map((section) => (
                            <Card key={section.key}>
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle>{section.label}</CardTitle>
                                            <CardDescription>{section.description}</CardDescription>
                                        </div>
                                        <Button onClick={() => addRow(section)} type="button" variant="secondary">
                                            Add row
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {form[section.key].map((row, index) => (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${section.key}-${index}`}>
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {section.label} row {index + 1}
                                                </p>
                                                <Button
                                                    onClick={() => removeRow(section, index)}
                                                    size="sm"
                                                    type="button"
                                                    variant="ghost"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {section.fields.map((field) => (
                                                    <div
                                                        className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}
                                                        key={field.key}
                                                    >
                                                        <Label>{field.label}</Label>
                                                        {field.type === "textarea" ? (
                                                            <Textarea
                                                                className="min-h-24"
                                                                onChange={(event) =>
                                                                    updateRow(section, index, field.key, event.target.value)
                                                                }
                                                                value={row[field.key] ?? ""}
                                                            />
                                                        ) : field.type === "select" ? (
                                                            <Select
                                                                onValueChange={(value) =>
                                                                    updateRow(section, index, field.key, value)
                                                                }
                                                                value={row[field.key] ?? ""}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(
                                                                        field.key === "programDisplayOrder"
                                                                            ? form.communityOutreachPrograms.map((programRow, programIndex) => ({
                                                                                  value: String(programIndex + 1),
                                                                                  label:
                                                                                      programRow.title?.trim() ||
                                                                                      `Program row ${programIndex + 1}`,
                                                                              }))
                                                                            : (field.options ?? []).map((option) => ({
                                                                                  value: option,
                                                                                  label: option,
                                                                              }))
                                                                    ).map((option) => (
                                                                        <SelectItem key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                onChange={(event) =>
                                                                    updateRow(section, index, field.key, event.target.value)
                                                                }
                                                                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                                                                value={row[field.key] ?? ""}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex flex-wrap gap-3">
                            <Button disabled={isPending} onClick={saveDraft} type="button">
                                Save draft
                            </Button>
                            <Button
                                disabled={isPending || !["Draft", "Rejected"].includes(selectedAssignment.status)}
                                onClick={submitAssignment}
                                type="button"
                                variant="secondary"
                            >
                                Submit for review
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Mapped evidence</CardTitle>
                                <CardDescription>
                                    Reviewer-visible evidence already linked to this record.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {selectedAssignment.documents.length ? (
                                    selectedAssignment.documents.map((document) => (
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={document.id}>
                                            <p className="text-sm font-medium text-zinc-950">
                                                {document.fileName || document.id}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {document.verificationStatus || "Unverified"}
                                            </p>
                                            {document.fileUrl ? (
                                                <a
                                                    className="mt-2 inline-block text-xs font-medium text-zinc-900 underline"
                                                    href={document.fileUrl}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    Open file
                                                </a>
                                            ) : null}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                        No manual evidence files are linked yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workflow history</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedAssignment.statusLogs.length ? (
                                        selectedAssignment.statusLogs.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.status}-${index}`}>
                                                <p className="text-sm font-medium text-zinc-950">{entry.status}</p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {entry.actorName || "System"} · {entry.actorRole || "Workflow"} ·{" "}
                                                    {formatDateTime(entry.changedAt)}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-sm text-zinc-600">{entry.remarks}</p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No workflow history yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Review history</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedAssignment.reviewHistory.length ? (
                                        selectedAssignment.reviewHistory.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.stage}-${index}`}>
                                                <p className="text-sm font-medium text-zinc-950">
                                                    {entry.stage} · {entry.decision}
                                                </p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {entry.reviewerName || "Reviewer"} · {entry.reviewerRole || "Leadership"} ·{" "}
                                                    {formatDateTime(entry.reviewedAt)}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-sm text-zinc-600">{entry.remarks}</p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No review remarks yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
