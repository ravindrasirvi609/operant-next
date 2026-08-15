"use client";

import Link from "next/link";
import { Building2, FileWarning, Flag, Globe2, MapPin, Pencil, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { StatTile } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RecordType } from "@/lib/student/record-validators";
import { FileUpload, InlineUpload } from "@/components/ui/file-upload";
import type { UploadedDocument } from "@/lib/upload/service";

// ── Types ────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

interface StudentRecords {
    academics: AnyRecord[];
    publications: AnyRecord[];
    research: AnyRecord[];
    awards: AnyRecord[];
    skills: AnyRecord[];
    sports: AnyRecord[];
    cultural: AnyRecord[];
    events: AnyRecord[];
    social: AnyRecord[];
    placements: AnyRecord[];
    internships: AnyRecord[];
}

type StudentMeta = {
    userId: string;
    studentName: string;
    studentEmail: string;
    enrollmentNo: string;
    studentStatus: string;
    accountStatus: string;
    institutionName?: string;
    departmentName?: string;
    programName?: string;
    degreeType?: string;
    lastLoginAt?: string | Date;
};

type SemesterOption = {
    _id: string;
    semesterNumber?: number;
    academicYearId?: { yearStart?: number; yearEnd?: number } | string;
};

type EvidenceDocument = {
    _id?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    verified?: boolean;
    verificationStatus?: "Pending" | "Verified" | "Rejected";
    verificationRemarks?: string;
} | string | null | undefined;

type MasterOption = {
    _id: string;
    name?: string;
    title?: string;
    category?: string;
    level?: string;
    organizingBody?: string;
    sportName?: string;
    eventType?: string;
    organizedBy?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    type?: string;
};

type StudentMasterData = {
    awards: MasterOption[];
    skills: MasterOption[];
    sports: MasterOption[];
    events: MasterOption[];
    culturalActivities: MasterOption[];
    socialPrograms: MasterOption[];
};

// ── Helpers ──────────────────────────────────────────────────────

function fmtDate(value?: string | Date | null) {
    if (!value) return "-";
    const d = new Date(value as string);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function refName(ref: any, field: string = "name") {
    if (!ref) return "-";
    if (typeof ref === "string") return ref;
    return ref[field] ?? ref.title ?? ref.sportName ?? "-";
}

/** Populated refs come back as objects on edit; forms need the raw id for a <select>. */
function idOf(ref: any): string {
    if (!ref) return "";
    if (typeof ref === "string") return ref;
    return ref._id ?? "";
}

/** `<input type="date">` needs `yyyy-mm-dd`; existing records store full Date/ISO values. */
function toDateInputValue(value?: string | Date | null): string {
    if (!value) return "";
    const d = new Date(value as string);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}


const recordsTabs = [
    { value: "academics", label: "Academics" },
    { value: "publications", label: "Publications" },
    { value: "research", label: "Research" },
    { value: "awards", label: "Awards" },
    { value: "skills", label: "Skills" },
    { value: "sports", label: "Sports" },
    { value: "cultural", label: "Cultural" },
    { value: "events", label: "Events" },
    { value: "social", label: "Social" },
    { value: "placements", label: "Placements" },
    { value: "internships", label: "Internships" },
] as const;

type RecordsTabValue = (typeof recordsTabs)[number]["value"];

const defaultRecordsTab = recordsTabs[0].value;

function resolveRecordsTab(value: string | null): RecordsTabValue {
    const match = recordsTabs.find((tab) => tab.value === value);
    return match?.value ?? defaultRecordsTab;
}

function buildRecordsTabHref(tab: RecordsTabValue) {
    return tab === defaultRecordsTab ? "/student/records" : `/student/records?tab=${tab}`;
}

// ── Main Component ───────────────────────────────────────────────

export function StudentRecordsDashboard({
    initialRecords,
    studentMeta,
}: {
    initialRecords: StudentRecords;
    studentMeta: StudentMeta;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [records, setRecords] = useState<StudentRecords>(initialRecords);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [activeForm, setActiveForm] = useState<RecordType | null>(null);
    const [editingRecord, setEditingRecord] = useState<{
        type: RecordType;
        id: string;
        data: AnyRecord;
    } | null>(null);
    const [semesters, setSemesters] = useState<SemesterOption[]>([]);
    const [semesterError, setSemesterError] = useState<string | null>(null);
    const [masterData, setMasterData] = useState<StudentMasterData>({
        awards: [],
        skills: [],
        sports: [],
        events: [],
        culturalActivities: [],
        socialPrograms: [],
    });
    const [masterError, setMasterError] = useState<string | null>(null);
    const [correctionRequests, setCorrectionRequests] = useState<AnyRecord[]>([]);
    const [correctionRequestFor, setCorrectionRequestFor] = useState<string | null>(null);
    const activeTab = resolveRecordsTab(searchParams.get("tab"));

    const refreshCorrectionRequests = useCallback(() => {
        fetch("/api/student/academic-records/edit-requests")
            .then((res) => res.json())
            .then((data) => setCorrectionRequests((data?.requests ?? []) as AnyRecord[]))
            .catch(() => setCorrectionRequests([]));
    }, []);

    const refreshRecords = useCallback(() => {
        startTransition(async () => {
            const res = await fetch("/api/student/records");
            if (res.ok) {
                const data = (await res.json()) as StudentRecords;
                setRecords(data);
            }
            router.refresh();
        });
    }, [router]);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/student/semesters")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setSemesters((data?.semesters ?? []) as SemesterOption[]);
                setSemesterError(null);
            })
            .catch(() => {
                if (cancelled) return;
                setSemesterError("Unable to load semesters.");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/student/master-data")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setMasterData({
                    awards: data.awards ?? [],
                    skills: data.skills ?? [],
                    sports: data.sports ?? [],
                    events: data.events ?? [],
                    culturalActivities: data.culturalActivities ?? [],
                    socialPrograms: data.socialPrograms ?? [],
                });
                setMasterError(null);
            })
            .catch(() => {
                if (cancelled) return;
                setMasterError("Unable to load master data.");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        refreshCorrectionRequests();
    }, [refreshCorrectionRequests]);

    const pendingCorrectionByRecordId = new Map(
        correctionRequests
            .filter((r) => r.status === "Pending")
            .map((r) => [String(r.academicRecordId), r])
    );

    async function submitCorrectionRequest(academicRecordId: string, data: AnyRecord) {
        setMessage(null);
        const res = await fetch(`/api/student/academic-records/${academicRecordId}/edit-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = (await res.json()) as { message?: string };
        if (!res.ok) {
            setMessage({
                type: "error",
                text: result.message ?? "Failed to submit correction request.",
            });
            return;
        }
        setMessage({ type: "success", text: result.message ?? "Correction request submitted." });
        setCorrectionRequestFor(null);
        refreshCorrectionRequests();
    }

    function handleTabChange(nextTabValue: string) {
        const nextTab = resolveRecordsTab(nextTabValue);

        if (nextTab === activeTab) {
            return;
        }

        setActiveForm(null);
        setEditingRecord(null);
        setCorrectionRequestFor(null);

        const params = new URLSearchParams(searchParams.toString());
        if (nextTab === defaultRecordsTab) {
            params.delete("tab");
        } else {
            params.set("tab", nextTab);
        }

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }

    async function linkEvidenceDocument(type: RecordType, recordId: string, doc: UploadedDocument) {
        const patchResponse = await fetch("/api/student/records", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, id: recordId, documentId: doc._id }),
        });
        if (patchResponse.ok) refreshRecords();
    }

    async function handleCreate(type: RecordType, data: AnyRecord) {
        setMessage(null);
        const res = await fetch("/api/student/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, data }),
        });
        const result = (await res.json()) as { message?: string };
        if (!res.ok) {
            setMessage({
                type: "error",
                text: result.message ?? "Failed to create record.",
            });
            return;
        }
        setMessage({ type: "success", text: result.message ?? "Record added." });
        setActiveForm(null);
        refreshRecords();
    }

    async function handleUpdate(type: RecordType, id: string, data: AnyRecord) {
        setMessage(null);
        const res = await fetch("/api/student/records", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, id, data }),
        });
        const result = (await res.json()) as { message?: string };
        if (!res.ok) {
            setMessage({
                type: "error",
                text: result.message ?? "Failed to update record.",
            });
            return;
        }
        setMessage({ type: "success", text: result.message ?? "Record updated." });
        setActiveForm(null);
        setEditingRecord(null);
        refreshRecords();
    }

    function startEdit(type: RecordType, row: AnyRecord) {
        setMessage(null);
        setEditingRecord({ type, id: row._id, data: row });
        setActiveForm(type);
    }

    function cancelForm() {
        setActiveForm(null);
        setEditingRecord(null);
    }

    /** Shared create/edit wiring for a record-type form so each tab only states its own fields. */
    function formProps(type: RecordType) {
        const isEditing = editingRecord?.type === type;
        return {
            defaultValues: isEditing ? editingRecord.data : undefined,
            onSubmit: (data: AnyRecord) =>
                isEditing ? handleUpdate(type, editingRecord.id, data) : handleCreate(type, data),
            onCancel: cancelForm,
        };
    }

    async function handleDelete(type: RecordType, id: string) {
        setMessage(null);
        const res = await fetch("/api/student/records", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, id }),
        });
        const result = (await res.json()) as { message?: string };
        if (!res.ok) {
            setMessage({
                type: "error",
                text: result.message ?? "Failed to delete record.",
            });
            return;
        }
        setMessage({ type: "success", text: "Record removed." });
        refreshRecords();
    }

    const totalRecords =
        records.academics.length +
        records.publications.length +
        records.research.length +
        records.awards.length +
        records.skills.length +
        records.sports.length +
        records.cultural.length +
        records.events.length +
        records.social.length +
        records.placements.length +
        records.internships.length;

    return (
        <div className="space-y-6">
            <Card className="relative overflow-hidden border-border bg-card">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-info-muted/70 blur-3xl" />
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-success-muted/60 blur-3xl" />
                </div>
                <CardHeader className="relative space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">Student Records Workspace</CardTitle>
                        <Badge>{studentMeta.studentStatus}</Badge>
                        <Badge
                            className={
                                studentMeta.accountStatus === "Active"
                                    ? "bg-success-muted text-success-muted-foreground hover:bg-success-muted"
                                    : "bg-warning-muted text-warning-muted-foreground hover:bg-warning-muted"
                            }
                        >
                            {studentMeta.accountStatus}
                        </Badge>
                    </div>
                    <CardDescription className="text-base">
                        A professional evidence workspace for academic records, activities, research, and placement outcomes. This page is your source of truth for detailed accreditation data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <CountCard label="Student" countLabel={studentMeta.studentName} />
                    <CountCard label="Enrollment" countLabel={studentMeta.enrollmentNo} />
                    <CountCard
                        label="Academic Records"
                        count={records.academics.length}
                    />
                    <CountCard
                        label="Publications"
                        count={records.publications.length}
                    />
                    <CountCard
                        label="Skills & Certifications"
                        count={records.skills.length}
                    />
                    <CountCard
                        label="Total Records"
                        count={totalRecords}
                    />
                    <CountCard
                        label="Activities"
                        count={
                            records.sports.length +
                            records.cultural.length +
                            records.events.length +
                            records.social.length
                        }
                    />
                </CardContent>
            </Card>

            {message ? (
                <FormMessage message={message.text} type={message.type} />
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Navigation</CardTitle>
                            <CardDescription>Use route-based tabs to move across the student workspace.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Button asChild variant="secondary" className="w-full justify-between">
                                <Link href="/student">
                                    Open workspace home
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between">
                                <Link href="/student/profile">
                                    Open student overview
                                </Link>
                            </Button>

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                {recordsTabs
                                    .filter((tab) =>
                                        ["academics", "skills", "publications", "placements"].includes(tab.value)
                                    )
                                    .map((tab) => (
                                        <Button
                                            key={tab.value}
                                            asChild
                                            variant={activeTab === tab.value ? "default" : "outline"}
                                            className="w-full justify-between"
                                        >
                                            <Link href={buildRecordsTabHref(tab.value)}>
                                                {tab.label}
                                            </Link>
                                        </Button>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
                    {recordsTabs.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="shrink-0 rounded-xl px-3 py-2"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* ── Academic Records ── */}
                <TabsContent value="academics">
                    <SectionCard
                        title="Academic Records"
                        description="Semester-wise SGPA, CGPA, percentage, and results."
                        type="academic"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "academic" && (
                            <AcademicForm
                                onSubmit={(d) => handleCreate("academic", d)}
                                onCancel={() => setActiveForm(null)}
                                isPending={isPending}
                                semesters={semesters}
                                semesterError={semesterError}
                            />
                        )}
                        {correctionRequestFor && (
                            <AcademicCorrectionRequestForm
                                record={records.academics.find((a) => a._id === correctionRequestFor)}
                                onSubmit={(d) => submitCorrectionRequest(correctionRequestFor, d)}
                                onCancel={() => setCorrectionRequestFor(null)}
                                isPending={isPending}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Semester",
                                "SGPA",
                                "CGPA",
                                "Percentage",
                                "Rank",
                                "Result",
                                "",
                            ]}
                            rows={records.academics}
                            renderExtraActions={(r) => {
                                const pending = pendingCorrectionByRecordId.get(String(r._id));
                                if (pending) {
                                    return (
                                        <Badge variant="outline" className="whitespace-nowrap text-xs">
                                            Correction pending
                                        </Badge>
                                    );
                                }
                                return (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Request correction"
                                        title="Request a correction to this record"
                                        onClick={() => setCorrectionRequestFor(r._id)}
                                    >
                                        <FileWarning className="size-4" />
                                    </Button>
                                );
                            }}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {r.semesterNumber ??
                                            refName(r.semesterId, "semesterNumber") ??
                                            "-"}
                                    </TableCell>
                                    <TableCell>{r.sgpa ?? "-"}</TableCell>
                                    <TableCell>{r.cgpa ?? "-"}</TableCell>
                                    <TableCell>
                                        {r.percentage != null
                                            ? `${r.percentage}%`
                                            : "-"}
                                    </TableCell>
                                    <TableCell>{r.rank ?? "-"}</TableCell>
                                    <TableCell>
                                        {r.resultStatus ? (
                                            <ResultBadge
                                                status={r.resultStatus}
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField
                                        label="Semester"
                                        value={
                                            r.semesterNumber ??
                                            refName(r.semesterId, "semesterNumber") ??
                                            "-"
                                        }
                                    />
                                    <MobileField label="SGPA" value={r.sgpa ?? "-"} />
                                    <MobileField label="CGPA" value={r.cgpa ?? "-"} />
                                    <MobileField
                                        label="Percentage"
                                        value={r.percentage != null ? `${r.percentage}%` : "-"}
                                    />
                                    <MobileField label="Rank" value={r.rank ?? "-"} />
                                    <MobileField
                                        label="Result"
                                        value={r.resultStatus ? <ResultBadge status={r.resultStatus} /> : "-"}
                                    />
                                </>
                            )}
                            onDelete={(id) => handleDelete("academic", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Publications ── */}
                <TabsContent value="publications">
                    <SectionCard
                        title="Publications"
                        description="Journals, conference papers, and book publications."
                        type="publication"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "publication" && (
                            <PublicationForm
                                {...formProps("publication")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Title",
                                "Type",
                                "Journal / Publisher",
                                "Date",
                                "DOI",
                                "Indexed In",
                                "Evidence",
                                "",
                            ]}
                            rows={records.publications}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {r.title}
                                    </TableCell>
                                    <TableCell>
                                        {r.publicationType ? (
                                            <Badge variant="secondary">
                                                {r.publicationType}
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[24ch] truncate">
                                        {r.journalName || r.publisher || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.publicationDate)}
                                    </TableCell>
                                    <TableCell className="max-w-[24ch] truncate font-mono text-xs">
                                        {r.doi || "-"}
                                    </TableCell>
                                    <TableCell>{r.indexedIn || "-"}</TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="publication"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Title" value={r.title} />
                                    <MobileField
                                        label="Type"
                                        value={r.publicationType ? <Badge variant="secondary">{r.publicationType}</Badge> : "-"}
                                    />
                                    <MobileField label="Journal / Publisher" value={r.journalName || r.publisher || "-"} />
                                    <MobileField label="Date" value={fmtDate(r.publicationDate)} />
                                    <MobileField label="DOI" value={<span className="font-mono text-xs">{r.doi || "-"}</span>} />
                                    <MobileField label="Indexed In" value={r.indexedIn || "-"} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="publication"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("publication", row)}
                            onDelete={(id) => handleDelete("publication", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Research Projects ── */}
                <TabsContent value="research">
                    <SectionCard
                        title="Research Projects"
                        description="Undergraduate and postgraduate research activities."
                        type="research"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "research" && (
                            <ResearchForm
                                {...formProps("research")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Title",
                                "Guide",
                                "Status",
                                "Start",
                                "End",
                                "Evidence",
                                "",
                            ]}
                            rows={records.research}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium max-w-[220px] truncate">
                                        {r.title}
                                    </TableCell>
                                    <TableCell>
                                        {r.guideName || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {r.status ? (
                                            <StatusBadge status={r.status} />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.startDate)}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.endDate)}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="research"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Title" value={r.title} />
                                    <MobileField label="Guide" value={r.guideName || "-"} />
                                    <MobileField
                                        label="Status"
                                        value={r.status ? <StatusBadge status={r.status} /> : "-"}
                                    />
                                    <MobileField label="Start" value={fmtDate(r.startDate)} />
                                    <MobileField label="End" value={fmtDate(r.endDate)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="research"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("research", row)}
                            onDelete={(id) => handleDelete("research", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Awards ── */}
                <TabsContent value="awards">
                    <SectionCard
                        title="Awards & Achievements"
                        description="Recognition, prizes, and honours received."
                        type="award"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "award" && (
                            <AwardForm
                                {...formProps("award")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                awards={masterData.awards}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Award",
                                "Category",
                                "Level",
                                "Date",
                                "Evidence",
                                "",
                            ]}
                            rows={records.awards}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.awardId, "title")}
                                    </TableCell>
                                    <TableCell>
                                        {r.awardId?.category || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {r.awardId?.level ? (
                                            <LevelBadge
                                                level={r.awardId.level}
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.awardDate)}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="award"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Award" value={refName(r.awardId, "title")} />
                                    <MobileField label="Category" value={r.awardId?.category || "-"} />
                                    <MobileField
                                        label="Level"
                                        value={r.awardId?.level ? <LevelBadge level={r.awardId.level} /> : "-"}
                                    />
                                    <MobileField label="Date" value={fmtDate(r.awardDate)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="award"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("award", row)}
                            onDelete={(id) => handleDelete("award", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Skills ── */}
                <TabsContent value="skills">
                    <SectionCard
                        title="Skills & Certifications"
                        description="Technical skills, soft skills, and professional certifications."
                        type="skill"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "skill" && (
                            <SkillForm
                                {...formProps("skill")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                skills={masterData.skills}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Skill",
                                "Category",
                                "Provider",
                                "From",
                                "To",
                                "Evidence",
                                "",
                            ]}
                            rows={records.skills}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.skillId)}
                                    </TableCell>
                                    <TableCell>
                                        {r.skillId?.category ? (
                                            <Badge variant="secondary">
                                                {r.skillId.category}
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {r.provider || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.startDate)}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.endDate)}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="skill"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Skill" value={refName(r.skillId)} />
                                    <MobileField
                                        label="Category"
                                        value={
                                            r.skillId?.category ? (
                                                <Badge variant="secondary">
                                                    {r.skillId.category}
                                                </Badge>
                                            ) : (
                                                "-"
                                            )
                                        }
                                    />
                                    <MobileField label="Provider" value={r.provider || "-"} />
                                    <MobileField label="From" value={fmtDate(r.startDate)} />
                                    <MobileField label="To" value={fmtDate(r.endDate)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="skill"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("skill", row)}
                            onDelete={(id) => handleDelete("skill", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Sports ── */}
                <TabsContent value="sports">
                    <SectionCard
                        title="Sports Participation"
                        description="Sports events, achievements, and performance records."
                        type="sport"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "sport" && (
                            <SportForm
                                {...formProps("sport")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                sports={masterData.sports}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Sport",
                                "Event",
                                "Level",
                                "Position",
                                "Date",
                                "Evidence",
                                "",
                            ]}
                            rows={records.sports}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.sportId, "sportName")}
                                    </TableCell>
                                    <TableCell>{r.eventName}</TableCell>
                                    <TableCell>
                                        {r.level ? (
                                            <LevelBadge level={r.level} />
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {r.position || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.eventDate)}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="sport"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Sport" value={refName(r.sportId, "sportName")} />
                                    <MobileField label="Event" value={r.eventName} />
                                    <MobileField
                                        label="Level"
                                        value={r.level ? <LevelBadge level={r.level} /> : "-"}
                                    />
                                    <MobileField label="Position" value={r.position || "-"} />
                                    <MobileField label="Date" value={fmtDate(r.eventDate)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="sport"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("sport", row)}
                            onDelete={(id) => handleDelete("sport", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Cultural Participation ── */}
                <TabsContent value="cultural">
                    <SectionCard
                        title="Cultural Activities"
                        description="Cultural events participation and achievements."
                        type="cultural"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "cultural" && (
                            <CulturalForm
                                {...formProps("cultural")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                activities={masterData.culturalActivities}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Activity",
                                "Event",
                                "Level",
                                "Position",
                                "Date",
                                "Evidence",
                                "",
                            ]}
                            rows={records.cultural}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.activityId)}
                                    </TableCell>
                                    <TableCell>{r.eventName}</TableCell>
                                    <TableCell>
                                        {r.level || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {r.position || "-"}
                                    </TableCell>
                                    <TableCell>{fmtDate(r.date)}</TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="cultural"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Activity" value={refName(r.activityId)} />
                                    <MobileField label="Event" value={r.eventName} />
                                    <MobileField label="Level" value={r.level || "-"} />
                                    <MobileField label="Position" value={r.position || "-"} />
                                    <MobileField label="Date" value={fmtDate(r.date)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="cultural"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("cultural", row)}
                            onDelete={(id) => handleDelete("cultural", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Event Participation ── */}
                <TabsContent value="events">
                    <SectionCard
                        title="Event Participation"
                        description="Seminars, workshops, conferences, and symposiums."
                        type="event"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "event" && (
                            <EventForm
                                {...formProps("event")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                events={masterData.events}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Event",
                                "Type",
                                "Role",
                                "Paper Title",
                                "Evidence",
                                "",
                            ]}
                            rows={records.events}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.eventId, "title")}
                                    </TableCell>
                                    <TableCell>
                                        {r.eventId?.eventType ? (
                                            <Badge variant="secondary">
                                                {r.eventId.eventType}
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                r.role === "Presenter"
                                                    ? "bg-info-muted text-info-muted-foreground hover:bg-info-muted"
                                                    : ""
                                            }
                                            variant="secondary"
                                        >
                                            {r.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {r.paperTitle || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="event"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Event" value={refName(r.eventId, "title")} />
                                    <MobileField
                                        label="Type"
                                        value={
                                            r.eventId?.eventType ? (
                                                <Badge variant="secondary">
                                                    {r.eventId.eventType}
                                                </Badge>
                                            ) : (
                                                "-"
                                            )
                                        }
                                    />
                                    <MobileField
                                        label="Role"
                                        value={
                                            <Badge
                                                className={
                                                    r.role === "Presenter"
                                                        ? "bg-info-muted text-info-muted-foreground hover:bg-info-muted"
                                                        : ""
                                                }
                                                variant="secondary"
                                            >
                                                {r.role}
                                            </Badge>
                                        }
                                    />
                                    <MobileField label="Paper Title" value={r.paperTitle || "-"} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="event"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("event", row)}
                            onDelete={(id) => handleDelete("event", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Social Participation ── */}
                <TabsContent value="social">
                    <SectionCard
                        title="Social & Extension Activities"
                        description="NSS, NCC, social work, and community extension."
                        type="social"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "social" && (
                            <SocialForm
                                {...formProps("social")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                                programs={masterData.socialPrograms}
                                masterError={masterError}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Program",
                                "Type",
                                "Activity",
                                "Hours",
                                "Date",
                                "Evidence",
                                "",
                            ]}
                            rows={records.social}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {refName(r.programId)}
                                    </TableCell>
                                    <TableCell>
                                        {r.programId?.type ? (
                                            <Badge variant="secondary">
                                                {r.programId.type}
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {r.activityName}
                                    </TableCell>
                                    <TableCell>
                                        {r.hoursContributed ?? "-"}
                                    </TableCell>
                                    <TableCell>{fmtDate(r.date)}</TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="social"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Program" value={refName(r.programId)} />
                                    <MobileField
                                        label="Type"
                                        value={
                                            r.programId?.type ? (
                                                <Badge variant="secondary">
                                                    {r.programId.type}
                                                </Badge>
                                            ) : (
                                                "-"
                                            )
                                        }
                                    />
                                    <MobileField label="Activity" value={r.activityName} />
                                    <MobileField label="Hours" value={r.hoursContributed ?? "-"} />
                                    <MobileField label="Date" value={fmtDate(r.date)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="social"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("social", row)}
                            onDelete={(id) => handleDelete("social", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Placements ── */}
                <TabsContent value="placements">
                    <SectionCard
                        title="Placement Records"
                        description="Job offers, joining dates, and placement outcomes."
                        type="placement"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "placement" && (
                            <PlacementForm
                                {...formProps("placement")}
                                isPending={isPending}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Company",
                                "Role",
                                "Package (LPA)",
                                "Offer Date",
                                "Joining Date",
                                "",
                            ]}
                            rows={records.placements}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {r.companyName}
                                    </TableCell>
                                    <TableCell>
                                        {r.jobRole || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {r.package != null
                                            ? `₹${Number(r.package).toLocaleString("en-IN")}`
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.offerDate)}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.joiningDate)}
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Company" value={r.companyName} />
                                    <MobileField label="Role" value={r.jobRole || "-"} />
                                    <MobileField
                                        label="Package (LPA)"
                                        value={
                                            r.package != null
                                                ? `₹${Number(r.package).toLocaleString("en-IN")}`
                                                : "-"
                                        }
                                    />
                                    <MobileField label="Offer Date" value={fmtDate(r.offerDate)} />
                                    <MobileField label="Joining Date" value={fmtDate(r.joiningDate)} />
                                </>
                            )}
                            onEdit={(row) => startEdit("placement", row)}
                            onDelete={(id) => handleDelete("placement", id)}
                        />
                    </SectionCard>
                </TabsContent>

                {/* ── Internships (model-level) ── */}
                <TabsContent value="internships">
                    <SectionCard
                        title="Internship Records"
                        description="Formal internships, industrial training, and apprenticeships."
                        type="internship"
                        activeForm={activeForm}
                        setActiveForm={setActiveForm}
                    >
                        {activeForm === "internship" && (
                            <InternshipRecordForm
                                {...formProps("internship")}
                                isPending={isPending}
                                userId={studentMeta.userId}
                            />
                        )}
                        <RecordTable
                            headers={[
                                "Company",
                                "Role",
                                "Stipend",
                                "Start",
                                "End",
                                "Evidence",
                                "",
                            ]}
                            rows={records.internships}
                            renderRow={(r) => (
                                <>
                                    <TableCell className="font-medium">
                                        {r.companyName}
                                    </TableCell>
                                    <TableCell>
                                        {r.role || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {r.stipend != null
                                            ? `₹${Number(r.stipend).toLocaleString("en-IN")}`
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.startDate)}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.endDate)}
                                    </TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="internship"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            userId={studentMeta.userId}
                                            onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                        />
                                    </TableCell>
                                </>
                            )}
                            renderMobileCard={(r) => (
                                <>
                                    <MobileField label="Company" value={r.companyName} />
                                    <MobileField label="Role" value={r.role || "-"} />
                                    <MobileField
                                        label="Stipend"
                                        value={
                                            r.stipend != null
                                                ? `₹${Number(r.stipend).toLocaleString("en-IN")}`
                                                : "-"
                                        }
                                    />
                                    <MobileField label="Start" value={fmtDate(r.startDate)} />
                                    <MobileField label="End" value={fmtDate(r.endDate)} />
                                    <MobileField
                                        label="Evidence"
                                        value={
                                            <EvidenceCell
                                                recordType="internship"
                                                recordId={r._id}
                                                document={r.documentId as EvidenceDocument}
                                                userId={studentMeta.userId}
                                                onLinked={(type, id, doc) => void linkEvidenceDocument(type, id, doc)}
                                            />
                                        }
                                    />
                                </>
                            )}
                            onEdit={(row) => startEdit("internship", row)}
                            onDelete={(id) => handleDelete("internship", id)}
                        />
                    </SectionCard>
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}

// ── Shared UI Primitives ─────────────────────────────────────────

function CountCard({
    label,
    count,
    countLabel,
}: {
    label: string;
    count?: number;
    countLabel?: string;
}) {
    return <StatTile label={label} value={countLabel ?? count ?? 0} />;
}

/**
 * Pass / Fail / Promoted / Withheld are workflow outcomes, so they go through
 * the shared status resolver rather than a private color map.
 */
function ResultBadge({ status }: { status: string }) {
    return <StatusBadge status={status} />;
}

/**
 * Scope level is an ORDINAL rank (College < State < National < International),
 * not a state. It deliberately does not use the semantic tones — those are
 * reserved for workflow status, and reusing them here would make "National"
 * look like a warning. Distinctness comes from the icon plus the label.
 */
const LEVEL_ICONS: Record<string, LucideIcon> = {
    College: Building2,
    State: MapPin,
    National: Flag,
    International: Globe2,
};

function LevelBadge({ level }: { level: string }) {
    const Icon = LEVEL_ICONS[level] ?? Building2;

    return (
        <Badge variant="outline" className="gap-1">
            <Icon aria-hidden />
            {level}
        </Badge>
    );
}

function SectionCard({
    title,
    description,
    type,
    activeForm,
    setActiveForm,
    children,
}: {
    title: string;
    description: string;
    type: RecordType;
    activeForm: RecordType | null;
    setActiveForm: (t: RecordType | null) => void;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                {activeForm !== type && (
                    <Button
                        size="sm"
                        onClick={() => setActiveForm(type)}
                        className="shrink-0"
                    >
                        <Plus className="mr-1 size-4" />
                        Add
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function DeleteRecordButton({ onConfirm }: { onConfirm: () => void }) {
    return (
        <ConfirmButton
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onConfirm={onConfirm}
            aria-label="Delete record"
            title="Delete this record?"
            description="This action cannot be undone."
        >
            <Trash2 className="size-4" />
        </ConfirmButton>
    );
}

function EditRecordButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit record"
            title="Edit this record"
            onClick={onClick}
        >
            <Pencil className="size-4" />
        </Button>
    );
}

/** A single label/value row inside a mobile record card. */
function MobileField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-medium text-foreground break-words">{value}</dd>
        </div>
    );
}

function RecordTable({
    headers,
    rows,
    renderRow,
    renderMobileCard,
    onEdit,
    onDelete,
    renderExtraActions,
}: {
    headers: string[];
    rows: AnyRecord[];
    renderRow: (row: AnyRecord) => React.ReactNode;
    renderMobileCard: (row: AnyRecord) => React.ReactNode;
    onEdit?: (row: AnyRecord) => void;
    onDelete: (id: string) => void;
    renderExtraActions?: (row: AnyRecord) => React.ReactNode;
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                No records added yet. Click &quot;Add&quot; to create your first
                entry.
            </div>
        );
    }

    return (
        <>
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {headers.map((h) => (
                                <TableHead key={h}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row._id}>
                                {renderRow(row)}
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                        {renderExtraActions?.(row)}
                                        {onEdit ? (
                                            <EditRecordButton onClick={() => onEdit(row)} />
                                        ) : null}
                                        <DeleteRecordButton onConfirm={() => onDelete(row._id)} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-3 md:hidden">
                {rows.map((row) => (
                    <div key={row._id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                            <dl className="flex-1 space-y-2">{renderMobileCard(row)}</dl>
                            <div className="flex items-center gap-1">
                                {renderExtraActions?.(row)}
                                {onEdit ? (
                                    <EditRecordButton onClick={() => onEdit(row)} />
                                ) : null}
                                <DeleteRecordButton onConfirm={() => onDelete(row._id)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ── Shared Form Primitives ───────────────────────────────────────

function FormField({
    label,
    id,
    children,
}: {
    label: string;
    id: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
        </div>
    );
}

function FormActions({
    onCancel,
    isPending,
}: {
    onCancel: () => void;
    isPending: boolean;
}) {
    return (
        <div className="flex gap-3 pt-2">
            <Button loading={isPending} type="submit" disabled={isPending}>
                Save
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
                <X aria-hidden />
                Cancel
            </Button>
        </div>
    );
}

function EvidenceUploadField({
    userId,
    label = "Evidence Document (optional)",
    defaultDocument,
    onChange,
}: {
    userId: string;
    label?: string;
    defaultDocument?: UploadedDocument | null;
    onChange?: (doc: UploadedDocument) => void;
}) {
    const [doc, setDoc] = useState<UploadedDocument | null>(defaultDocument ?? null);

    return (
        <div>
            <input type="hidden" name="documentId" value={doc?._id ?? ""} readOnly />
            <FileUpload
                category="evidence"
                ownerId={userId}
                mode="document"
                label={label}
                value={doc}
                onChange={(v) => {
                    const next = v as UploadedDocument | null;
                    setDoc(next);
                    if (next) onChange?.(next);
                }}
            />
        </div>
    );
}

function EvidenceCell({
    recordType,
    recordId,
    document,
    userId,
    onLinked,
}: {
    recordType: RecordType;
    recordId: string;
    document: EvidenceDocument;
    userId: string;
    onLinked?: (type: RecordType, id: string, doc: UploadedDocument) => void;
}) {
    const docObject = typeof document === "object" ? document : null;

    return (
        <div className="grid gap-1.5 text-xs">
            <InlineUpload
                category="evidence"
                ownerId={userId}
                mode="document"
                value={docObject ? (docObject as unknown as UploadedDocument) : null}
                onChange={(v) => {
                    if (v && typeof v === "object") {
                        onLinked?.(recordType, recordId, v as UploadedDocument);
                    }
                }}
                placeholder={docObject?.fileUrl ? "Replace" : "Upload evidence"}
            />
            {docObject?.verificationRemarks ? (
                <span className="text-[11px] text-muted-foreground">{docObject.verificationRemarks}</span>
            ) : null}
        </div>
    );
}

// ── Individual Record Forms ──────────────────────────────────────

function AcademicForm({
    onSubmit,
    onCancel,
    isPending,
    semesters,
    semesterError,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    semesters: SemesterOption[];
    semesterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    semesterId: fd.get("semesterId"),
                    sgpa: fd.get("sgpa") || undefined,
                    cgpa: fd.get("cgpa") || undefined,
                    percentage: fd.get("percentage") || undefined,
                    rank: fd.get("rank") || undefined,
                    resultStatus: fd.get("resultStatus") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Semester" id="semesterId">
                    <NativeSelect
                        id="semesterId"
                        name="semesterId"
                        required
                    >
                        <option value="">Select semester</option>
                        {semesters.map((semester) => {
                            const academicYear =
                                typeof semester.academicYearId === "string"
                                    ? semester.academicYearId
                                    : semester.academicYearId
                                        ? `${semester.academicYearId.yearStart}-${semester.academicYearId.yearEnd}`
                                        : "Academic Year";
                            return (
                                <option key={semester._id} value={semester._id}>
                                    Semester {semester.semesterNumber ?? "-"} • {academicYear}
                                </option>
                            );
                        })}
                    </NativeSelect>
                    {semesterError ? (
                        <p className="text-xs text-destructive">{semesterError}</p>
                    ) : null}
                </FormField>
                <FormField label="SGPA" id="sgpa">
                    <Input
                        id="sgpa"
                        name="sgpa"
                        type="number"
                        step="0.01"
                        min={0}
                        max={10}
                    />
                </FormField>
                <FormField label="CGPA" id="cgpa">
                    <Input
                        id="cgpa"
                        name="cgpa"
                        type="number"
                        step="0.01"
                        min={0}
                        max={10}
                    />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Percentage" id="percentage">
                    <Input
                        id="percentage"
                        name="percentage"
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                    />
                </FormField>
                <FormField label="Rank" id="rank">
                    <Input
                        id="rank"
                        name="rank"
                        type="number"
                        min={1}
                    />
                </FormField>
                <FormField label="Result Status" id="resultStatus">
                    <NativeSelect
                        id="resultStatus"
                        name="resultStatus"
                    >
                        <option value="">Select status</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Withheld">Withheld</option>
                    </NativeSelect>
                </FormField>
            </div>
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

/**
 * Semester grades are official records, so students can't edit them directly —
 * this submits a correction request that an Admin/Director must approve.
 */
function AcademicCorrectionRequestForm({
    record,
    onSubmit,
    onCancel,
    isPending,
}: {
    record?: AnyRecord;
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    if (!record) {
        return null;
    }

    return (
        <form
            className="rounded-lg border border-warning-muted bg-warning-muted/30 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const requestedChanges: AnyRecord = {};
                for (const field of ["sgpa", "cgpa", "percentage", "rank", "resultStatus"]) {
                    const value = fd.get(field);
                    if (value) requestedChanges[field] = value;
                }
                onSubmit({ requestedChanges, reason: fd.get("reason") });
            }}
        >
            <p className="text-sm text-muted-foreground">
                Semester {record.semesterNumber ?? refName(record.semesterId, "semesterNumber") ?? "-"} — only fill in
                the fields you want corrected. This request needs review before it takes effect.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label={`SGPA (current: ${record.sgpa ?? "-"})`} id="sgpa">
                    <Input id="sgpa" name="sgpa" type="number" step="0.01" min={0} max={10} />
                </FormField>
                <FormField label={`CGPA (current: ${record.cgpa ?? "-"})`} id="cgpa">
                    <Input id="cgpa" name="cgpa" type="number" step="0.01" min={0} max={10} />
                </FormField>
                <FormField label={`Percentage (current: ${record.percentage ?? "-"})`} id="percentage">
                    <Input id="percentage" name="percentage" type="number" step="0.01" min={0} max={100} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label={`Rank (current: ${record.rank ?? "-"})`} id="rank">
                    <Input id="rank" name="rank" type="number" min={1} />
                </FormField>
                <FormField label={`Result Status (current: ${record.resultStatus ?? "-"})`} id="resultStatus">
                    <NativeSelect id="resultStatus" name="resultStatus">
                        <option value="">No change</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Withheld">Withheld</option>
                    </NativeSelect>
                </FormField>
            </div>
            <FormField label="Reason for correction" id="reason">
                <Textarea id="reason" name="reason" required placeholder="Explain why this record needs to change." />
            </FormField>
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function PublicationForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    title: fd.get("title"),
                    journalName: fd.get("journalName") || undefined,
                    publisher: fd.get("publisher") || undefined,
                    publicationType: fd.get("publicationType") || undefined,
                    publicationDate: fd.get("publicationDate") || undefined,
                    doi: fd.get("doi") || undefined,
                    indexedIn: fd.get("indexedIn") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Title" id="title">
                    <Input id="title" name="title" required defaultValue={defaultValues?.title} />
                </FormField>
                <FormField label="Publication Type" id="publicationType">
                    <NativeSelect
                        id="publicationType"
                        name="publicationType"
                        defaultValue={defaultValues?.publicationType ?? ""}
                    >
                        <option value="">Select type</option>
                        <option value="Journal">Journal</option>
                        <option value="Conference">Conference</option>
                        <option value="Book">Book</option>
                    </NativeSelect>
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Journal Name" id="journalName">
                    <Input id="journalName" name="journalName" defaultValue={defaultValues?.journalName} />
                </FormField>
                <FormField label="Publisher" id="publisher">
                    <Input id="publisher" name="publisher" defaultValue={defaultValues?.publisher} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Publication Date" id="publicationDate">
                    <Input
                        id="publicationDate"
                        name="publicationDate"
                        type="date"
                        defaultValue={toDateInputValue(defaultValues?.publicationDate)}
                    />
                </FormField>
                <FormField label="DOI" id="doi">
                    <Input id="doi" name="doi" placeholder="10.xxxx/xxxxx" defaultValue={defaultValues?.doi} />
                </FormField>
                <FormField label="Indexed In" id="indexedIn">
                    <Input
                        id="indexedIn"
                        name="indexedIn"
                        placeholder="Scopus, Web of Science, etc."
                        defaultValue={defaultValues?.indexedIn}
                    />
                </FormField>
            </div>
            <EvidenceUploadField
                userId={userId}
                label="Publication proof (optional)"
                defaultDocument={defaultValues?.documentId as UploadedDocument | null}
            />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function ResearchForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    title: fd.get("title"),
                    guideName: fd.get("guideName") || undefined,
                    startDate: fd.get("startDate") || undefined,
                    endDate: fd.get("endDate") || undefined,
                    status: fd.get("status") || undefined,
                    description: fd.get("description") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Project Title" id="title">
                    <Input id="title" name="title" required defaultValue={defaultValues?.title} />
                </FormField>
                <FormField label="Guide / Supervisor" id="guideName">
                    <Input id="guideName" name="guideName" defaultValue={defaultValues?.guideName} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(defaultValues?.startDate)} />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(defaultValues?.endDate)} />
                </FormField>
                <FormField label="Status" id="status">
                    <NativeSelect
                        id="status"
                        name="status"
                        defaultValue={defaultValues?.status ?? ""}
                    >
                        <option value="">Select status</option>
                        <option value="Planned">Planned</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                    </NativeSelect>
                </FormField>
            </div>
            <FormField label="Description" id="description">
                <Textarea id="description" name="description" defaultValue={defaultValues?.description} />
            </FormField>
            <EvidenceUploadField
                userId={userId}
                label="Research proof (optional)"
                defaultDocument={defaultValues?.documentId as UploadedDocument | null}
            />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function AwardForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    awards,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    awards: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    awardId: fd.get("awardId") || undefined,
                    awardDate: fd.get("awardDate") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Award" id="awardId">
                    <NativeSelect
                        id="awardId"
                        name="awardId"
                        required
                        defaultValue={idOf(defaultValues?.awardId)}
                    >
                        <option value="">Select award</option>
                        {awards.map((award) => (
                            <option key={award._id} value={award._id}>
                                {award.title ?? award.name}
                                {award.category ? ` • ${award.category}` : ""}
                                {award.level ? ` • ${award.level}` : ""}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : awards.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No awards found. Ask admin to add master awards.
                        </p>
                    ) : null}
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Award Date" id="awardDate">
                    <Input id="awardDate" name="awardDate" type="date" defaultValue={toDateInputValue(defaultValues?.awardDate)} />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function SkillForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    skills,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    skills: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    skillId: fd.get("skillId") || undefined,
                    provider: fd.get("provider") || undefined,
                    startDate: fd.get("startDate") || undefined,
                    endDate: fd.get("endDate") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Skill" id="skillId">
                    <NativeSelect
                        id="skillId"
                        name="skillId"
                        required
                        defaultValue={idOf(defaultValues?.skillId)}
                    >
                        <option value="">Select skill</option>
                        {skills.map((skill) => (
                            <option key={skill._id} value={skill._id}>
                                {skill.name ?? skill.title}
                                {skill.category ? ` • ${skill.category}` : ""}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : skills.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No skills found. Ask admin to add skill masters.
                        </p>
                    ) : null}
                </FormField>
                <FormField label="Provider / Platform" id="provider">
                    <Input
                        id="provider"
                        name="provider"
                        placeholder="Coursera, NPTEL, etc."
                        defaultValue={defaultValues?.provider}
                    />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(defaultValues?.startDate)} />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(defaultValues?.endDate)} />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function SportForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    sports,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    sports: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    sportId: fd.get("sportId") || undefined,
                    eventName: fd.get("eventName"),
                    level: fd.get("level") || undefined,
                    position: fd.get("position") || undefined,
                    eventDate: fd.get("eventDate") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Sport" id="sportId">
                    <NativeSelect
                        id="sportId"
                        name="sportId"
                        required
                        defaultValue={idOf(defaultValues?.sportId)}
                    >
                        <option value="">Select sport</option>
                        {sports.map((sport) => (
                            <option key={sport._id} value={sport._id}>
                                {sport.sportName ?? sport.name ?? sport.title}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : sports.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No sports found. Ask admin to add sport masters.
                        </p>
                    ) : null}
                </FormField>
                <FormField label="Event Name" id="eventName">
                    <Input
                        id="eventName"
                        name="eventName"
                        required
                        placeholder="Inter-college tournament, etc."
                        defaultValue={defaultValues?.eventName}
                    />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Level" id="level">
                    <NativeSelect
                        id="level"
                        name="level"
                        defaultValue={defaultValues?.level ?? ""}
                    >
                        <option value="">Select level</option>
                        <option value="College">College</option>
                        <option value="State">State</option>
                        <option value="National">National</option>
                        <option value="International">International</option>
                    </NativeSelect>
                </FormField>
                <FormField label="Position / Rank" id="position">
                    <Input
                        id="position"
                        name="position"
                        placeholder="1st, Runner-up, etc."
                        defaultValue={defaultValues?.position}
                    />
                </FormField>
                <FormField label="Event Date" id="eventDate">
                    <Input id="eventDate" name="eventDate" type="date" defaultValue={toDateInputValue(defaultValues?.eventDate)} />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function CulturalForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    activities,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    activities: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    activityId: fd.get("activityId") || undefined,
                    eventName: fd.get("eventName"),
                    level: fd.get("level") || undefined,
                    position: fd.get("position") || undefined,
                    date: fd.get("date") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Cultural Activity" id="activityId">
                    <NativeSelect
                        id="activityId"
                        name="activityId"
                        required
                        defaultValue={idOf(defaultValues?.activityId)}
                    >
                        <option value="">Select activity</option>
                        {activities.map((activity) => (
                            <option key={activity._id} value={activity._id}>
                                {activity.name ?? activity.title}
                                {activity.category ? ` • ${activity.category}` : ""}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : activities.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No activities found. Ask admin to add cultural masters.
                        </p>
                    ) : null}
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="Event Name" id="eventName">
                    <Input id="eventName" name="eventName" required defaultValue={defaultValues?.eventName} />
                </FormField>
                <FormField label="Level" id="level">
                    <Input
                        id="level"
                        name="level"
                        placeholder="College, State, etc."
                        defaultValue={defaultValues?.level}
                    />
                </FormField>
                <FormField label="Position" id="position">
                    <Input
                        id="position"
                        name="position"
                        placeholder="Winner, Participant, etc."
                        defaultValue={defaultValues?.position}
                    />
                </FormField>
                <FormField label="Date" id="date">
                    <Input id="date" name="date" type="date" defaultValue={toDateInputValue(defaultValues?.date)} />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function EventForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    events,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    events: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    const [role, setRole] = useState(defaultValues?.role ?? "Participant");
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    eventId: fd.get("eventId") || undefined,
                    role,
                    paperTitle: fd.get("paperTitle") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Event" id="eventId">
                    <NativeSelect
                        id="eventId"
                        name="eventId"
                        required
                        defaultValue={idOf(defaultValues?.eventId)}
                    >
                        <option value="">Select event</option>
                        {events.map((event) => (
                            <option key={event._id} value={event._id}>
                                {event.title ?? event.name}
                                {event.eventType ? ` • ${event.eventType}` : ""}
                                {event.startDate ? ` • ${fmtDate(event.startDate)}` : ""}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : events.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No events found. Ask admin to add event masters.
                        </p>
                    ) : null}
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Role" id="role">
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="role" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Participant">
                                Participant
                            </SelectItem>
                            <SelectItem value="Presenter">Presenter</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
            </div>
            {role === "Presenter" && (
                <FormField label="Paper Title" id="paperTitle">
                    <Input
                        id="paperTitle"
                        name="paperTitle"
                        placeholder="Title of presented paper"
                        defaultValue={defaultValues?.paperTitle}
                    />
                </FormField>
            )}
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function SocialForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    programs,
    masterError,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    programs: MasterOption[];
    masterError: string | null;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    programId: fd.get("programId") || undefined,
                    activityName: fd.get("activityName"),
                    hoursContributed: fd.get("hoursContributed") || undefined,
                    date: fd.get("date") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Program" id="programId">
                    <NativeSelect
                        id="programId"
                        name="programId"
                        required
                        defaultValue={idOf(defaultValues?.programId)}
                    >
                        <option value="">Select program</option>
                        {programs.map((program) => (
                            <option key={program._id} value={program._id}>
                                {program.name ?? program.title}
                                {program.type ? ` • ${program.type}` : ""}
                            </option>
                        ))}
                    </NativeSelect>
                    {masterError ? (
                        <p className="text-xs text-destructive">{masterError}</p>
                    ) : programs.length === 0 ? (
                        <p className="text-xs text-warning-muted-foreground">
                            No social programs found. Ask admin to add program masters.
                        </p>
                    ) : null}
                </FormField>
                <FormField label="Activity Name" id="activityName">
                    <Input id="activityName" name="activityName" required defaultValue={defaultValues?.activityName} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Hours Contributed" id="hoursContributed">
                    <Input
                        id="hoursContributed"
                        name="hoursContributed"
                        type="number"
                        min={0}
                        defaultValue={defaultValues?.hoursContributed}
                    />
                </FormField>
                <FormField label="Date" id="date">
                    <Input id="date" name="date" type="date" defaultValue={toDateInputValue(defaultValues?.date)} />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function PlacementForm({
    onSubmit,
    onCancel,
    isPending,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    companyName: fd.get("companyName"),
                    jobRole: fd.get("jobRole") || undefined,
                    package: fd.get("package") || undefined,
                    offerDate: fd.get("offerDate") || undefined,
                    joiningDate: fd.get("joiningDate") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company Name" id="companyName">
                    <Input id="companyName" name="companyName" required defaultValue={defaultValues?.companyName} />
                </FormField>
                <FormField label="Job Role" id="jobRole">
                    <Input id="jobRole" name="jobRole" defaultValue={defaultValues?.jobRole} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Package (Annual)" id="package">
                    <Input
                        id="package"
                        name="package"
                        type="number"
                        min={0}
                        placeholder="e.g. 600000"
                        defaultValue={defaultValues?.package}
                    />
                </FormField>
                <FormField label="Offer Date" id="offerDate">
                    <Input id="offerDate" name="offerDate" type="date" defaultValue={toDateInputValue(defaultValues?.offerDate)} />
                </FormField>
                <FormField label="Joining Date" id="joiningDate">
                    <Input id="joiningDate" name="joiningDate" type="date" defaultValue={toDateInputValue(defaultValues?.joiningDate)} />
                </FormField>
            </div>
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function InternshipRecordForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
    defaultValues,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    defaultValues?: AnyRecord;
}) {
    return (
        <form
            className="rounded-lg border border-border bg-muted/50 p-4 space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSubmit({
                    companyName: fd.get("companyName"),
                    role: fd.get("role") || undefined,
                    startDate: fd.get("startDate") || undefined,
                    endDate: fd.get("endDate") || undefined,
                    stipend: fd.get("stipend") || undefined,
                    documentId: fd.get("documentId") || undefined,
                });
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company Name" id="companyName">
                    <Input id="companyName" name="companyName" required defaultValue={defaultValues?.companyName} />
                </FormField>
                <FormField label="Role" id="role">
                    <Input id="role" name="role" defaultValue={defaultValues?.role} />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(defaultValues?.startDate)} />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(defaultValues?.endDate)} />
                </FormField>
                <FormField label="Monthly Stipend" id="stipend">
                    <Input
                        id="stipend"
                        name="stipend"
                        type="number"
                        min={0}
                        placeholder="e.g. 15000"
                        defaultValue={defaultValues?.stipend}
                    />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} defaultDocument={defaultValues?.documentId as UploadedDocument | null} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}
