"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RecordType } from "@/lib/student/record-validators";
import {
    UploadValidationError,
    type UploadProgress,
    uploadFile,
    validateFile,
} from "@/lib/upload/service";

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

const selectBaseClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

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
    const [semesters, setSemesters] = useState<SemesterOption[]>([]);
    const [semesterError, setSemesterError] = useState<string | null>(null);
    const [evidenceProgress, setEvidenceProgress] = useState<Record<string, UploadProgress | null>>({});
    const [evidenceError, setEvidenceError] = useState<Record<string, string>>({});
    const [masterData, setMasterData] = useState<StudentMasterData>({
        awards: [],
        skills: [],
        sports: [],
        events: [],
        culturalActivities: [],
        socialPrograms: [],
    });
    const [masterError, setMasterError] = useState<string | null>(null);
    const activeTab = resolveRecordsTab(searchParams.get("tab"));

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

    const evidenceKey = useCallback((type: RecordType, id: string) => `${type}:${id}`, []);

    function handleTabChange(nextTabValue: string) {
        const nextTab = resolveRecordsTab(nextTabValue);

        if (nextTab === activeTab) {
            return;
        }

        setActiveForm(null);

        const params = new URLSearchParams(searchParams.toString());
        if (nextTab === defaultRecordsTab) {
            params.delete("tab");
        } else {
            params.set("tab", nextTab);
        }

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }

    async function handleEvidenceUpload(type: RecordType, recordId: string, file: File) {
        const key = evidenceKey(type, recordId);
        setEvidenceError((current) => ({ ...current, [key]: "" }));

        try {
            validateFile(file, "evidence");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setEvidenceError((current) => ({ ...current, [key]: err.message }));
            }
            return;
        }

        setEvidenceProgress((current) => ({ ...current, [key]: null }));

        try {
            const result = await uploadFile(file, "evidence", studentMeta.userId, (progress) => {
                setEvidenceProgress((current) => ({ ...current, [key]: progress }));
            });

            const docResponse = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    fileUrl: result.downloadURL,
                    fileType: file.type,
                }),
            });

            const docData = (await docResponse.json()) as { document?: { _id?: string } };
            if (!docResponse.ok || !docData.document?._id) {
                throw new Error("Unable to save evidence document.");
            }

            const patchResponse = await fetch("/api/student/records", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    id: recordId,
                    documentId: docData.document._id,
                }),
            });

            if (!patchResponse.ok) {
                const patchData = (await patchResponse.json()) as { message?: string };
                throw new Error(patchData?.message ?? "Unable to link evidence.");
            }

            setEvidenceProgress((current) => ({ ...current, [key]: null }));
            refreshRecords();
        } catch (err) {
            setEvidenceProgress((current) => ({ ...current, [key]: null }));
            setEvidenceError((current) => ({
                ...current,
                [key]: err instanceof Error ? err.message : "Evidence upload failed.",
            }));
        }
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
            <Card className="relative overflow-hidden border-zinc-200 bg-white">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-sky-100/70 blur-3xl" />
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
                </div>
                <CardHeader className="relative space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">Student Records Workspace</CardTitle>
                        <Badge>{studentMeta.studentStatus}</Badge>
                        <Badge
                            className={
                                studentMeta.accountStatus === "Active"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100"
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
                    <Card className="border-zinc-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg">Student Mapping</CardTitle>
                            <CardDescription>Institution and program context used for all records.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <ReadOnlyLine label="Student" value={studentMeta.studentName} />
                            <ReadOnlyLine label="Institution Email" value={studentMeta.studentEmail} />
                            <ReadOnlyLine label="Institution" value={studentMeta.institutionName ?? "-"} />
                            <ReadOnlyLine label="Department" value={studentMeta.departmentName ?? "-"} />
                            <ReadOnlyLine label="Program" value={studentMeta.programName ?? "-"} />
                            <ReadOnlyLine label="Degree Type" value={studentMeta.degreeType ?? "-"} />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 bg-white">
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
                <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
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
                                onSubmit={(d) =>
                                    handleCreate("publication", d)
                                }
                                onCancel={() => setActiveForm(null)}
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
                                    <TableCell>
                                        {r.journalName || r.publisher || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {fmtDate(r.publicationDate)}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {r.doi || "-"}
                                    </TableCell>
                                    <TableCell>{r.indexedIn || "-"}</TableCell>
                                    <TableCell>
                                        <EvidenceCell
                                            recordType="publication"
                                            recordId={r._id}
                                            document={r.documentId as EvidenceDocument}
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("publication", r._id)]}
                                            error={evidenceError[evidenceKey("publication", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("research", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("research", r._id)]}
                                            error={evidenceError[evidenceKey("research", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("award", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("award", r._id)]}
                                            error={evidenceError[evidenceKey("award", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("skill", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("skill", r._id)]}
                                            error={evidenceError[evidenceKey("skill", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("sport", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("sport", r._id)]}
                                            error={evidenceError[evidenceKey("sport", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("cultural", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("cultural", r._id)]}
                                            error={evidenceError[evidenceKey("cultural", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("event", d)}
                                onCancel={() => setActiveForm(null)}
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
                                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("event", r._id)]}
                                            error={evidenceError[evidenceKey("event", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("social", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("social", r._id)]}
                                            error={evidenceError[evidenceKey("social", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
                                onSubmit={(d) => handleCreate("placement", d)}
                                onCancel={() => setActiveForm(null)}
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
                                onSubmit={(d) => handleCreate("internship", d)}
                                onCancel={() => setActiveForm(null)}
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
                                            onUpload={handleEvidenceUpload}
                                            progress={evidenceProgress[evidenceKey("internship", r._id)]}
                                            error={evidenceError[evidenceKey("internship", r._id)]}
                                        />
                                    </TableCell>
                                </>
                            )}
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
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">{countLabel ?? count ?? 0}</p>
        </div>
    );
}

function ResultBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Pass: "bg-emerald-100 text-emerald-700",
        Fail: "bg-red-100 text-red-700",
        Promoted: "bg-blue-100 text-blue-700",
        Withheld: "bg-amber-100 text-amber-700",
    };
    return (
        <Badge className={`${colors[status] ?? ""} hover:opacity-80`}>
            {status}
        </Badge>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Planned: "bg-zinc-100 text-zinc-700",
        Ongoing: "bg-blue-100 text-blue-700",
        Completed: "bg-emerald-100 text-emerald-700",
    };
    return (
        <Badge className={`${colors[status] ?? ""} hover:opacity-80`}>
            {status}
        </Badge>
    );
}

function LevelBadge({ level }: { level: string }) {
    const colors: Record<string, string> = {
        College: "bg-zinc-100 text-zinc-700",
        State: "bg-blue-100 text-blue-700",
        National: "bg-amber-100 text-amber-700",
        International: "bg-cyan-100 text-cyan-700",
    };
    return (
        <Badge className={`${colors[level] ?? ""} hover:opacity-80`}>
            {level}
        </Badge>
    );
}

function ReadOnlyLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="text-sm font-semibold text-zinc-900">{value}</p>
        </div>
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
        <Card className="border-zinc-200 bg-white shadow-sm">
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

function RecordTable({
    headers,
    rows,
    renderRow,
    onDelete,
}: {
    headers: string[];
    rows: AnyRecord[];
    renderRow: (row: AnyRecord) => React.ReactNode;
    onDelete: (id: string) => void;
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                No records added yet. Click &quot;Add&quot; to create your first
                entry.
            </div>
        );
    }

    return (
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onDelete(row._id)}
                                aria-label="Delete record"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
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
            <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : null}
                Save
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
            </Button>
        </div>
    );
}

function EvidenceUploadField({
    userId,
    label = "Evidence Document (optional)",
}: {
    userId: string;
    label?: string;
}) {
    const inputId = useId();
    const [document, setDocument] = useState<EvidenceDocument>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleUpload(file: File) {
        setError(null);
        try {
            validateFile(file, "evidence");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setError(err.message);
            }
            return;
        }

        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });

        try {
            const result = await uploadFile(file, "evidence", userId, (next) => {
                setProgress(next);
            });

            const docResponse = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    fileUrl: result.downloadURL,
                    fileType: file.type,
                }),
            });

            const docData = (await docResponse.json()) as { document?: EvidenceDocument };
            if (!docResponse.ok || !docData.document || typeof docData.document === "string") {
                throw new Error("Unable to save evidence document.");
            }

            setDocument(docData.document);
            setProgress(null);
        } catch (err) {
            setProgress(null);
            setError(err instanceof Error ? err.message : "Evidence upload failed.");
        }
    }

    const fileLabel = typeof document === "object" && document?.fileName ? document.fileName : "No file uploaded";
    const fileUrl = typeof document === "object" ? document?.fileUrl : undefined;

    return (
        <div className="grid gap-2 rounded-md border border-dashed border-zinc-300 bg-white p-3">
            <Label htmlFor={inputId}>{label}</Label>
            <Input
                id={inputId}
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        void handleUpload(file);
                    }
                }}
            />
            <input type="hidden" name="documentId" value={typeof document === "object" ? document?._id ?? "" : ""} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                {fileUrl ? (
                    <a
                        className="font-medium text-emerald-700 underline"
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {fileLabel}
                    </a>
                ) : (
                    <span>{fileLabel}</span>
                )}
                {progress ? <span>Uploading {progress.percent}%</span> : null}
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
    );
}

function EvidenceCell({
    recordType,
    recordId,
    document,
    onUpload,
    progress,
    error,
}: {
    recordType: RecordType;
    recordId: string;
    document: EvidenceDocument;
    onUpload: (type: RecordType, id: string, file: File) => void;
    progress?: UploadProgress | null;
    error?: string;
}) {
    const inputId = useId();
    const docObject = typeof document === "object" ? document : null;
    const hasDoc = !!docObject?.fileUrl;
    const status = docObject?.verificationStatus ?? (docObject?.verified ? "Verified" : "Pending");
    const statusClass =
        status === "Verified"
            ? "bg-emerald-100 text-emerald-700"
            : status === "Rejected"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700";

    return (
        <div className="grid gap-1 text-xs">
            {hasDoc ? (
                <a
                    className="font-medium text-sky-700 underline"
                    href={docObject?.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    {docObject?.fileName ?? "Evidence file"}
                </a>
            ) : (
                <span className="text-zinc-500">No evidence</span>
            )}
            {docObject ? (
                <Badge variant="secondary" className={statusClass}>
                    {status}
                </Badge>
            ) : null}
            {docObject?.verificationRemarks ? (
                <span className="text-[11px] text-zinc-500">
                    {docObject.verificationRemarks}
                </span>
            ) : null}
            <label
                htmlFor={inputId}
                className="inline-flex w-fit cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
                {hasDoc ? "Replace" : "Upload"}
            </label>
            <input
                id={inputId}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUpload(recordType, recordId, file);
                    }
                }}
            />
            {progress ? <span className="text-zinc-500">Uploading {progress.percent}%</span> : null}
            {error ? <span className="text-rose-600">{error}</span> : null}
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
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="semesterId"
                        name="semesterId"
                        required
                        className={selectBaseClass}
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
                    </select>
                    {semesterError ? (
                        <p className="text-xs text-rose-600">{semesterError}</p>
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
                    <select
                        id="resultStatus"
                        name="resultStatus"
                        className={selectBaseClass}
                    >
                        <option value="">Select status</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Withheld">Withheld</option>
                    </select>
                </FormField>
            </div>
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function PublicationForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <Input id="title" name="title" required />
                </FormField>
                <FormField label="Publication Type" id="publicationType">
                    <select
                        id="publicationType"
                        name="publicationType"
                        className={selectBaseClass}
                    >
                        <option value="">Select type</option>
                        <option value="Journal">Journal</option>
                        <option value="Conference">Conference</option>
                        <option value="Book">Book</option>
                    </select>
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Journal Name" id="journalName">
                    <Input id="journalName" name="journalName" />
                </FormField>
                <FormField label="Publisher" id="publisher">
                    <Input id="publisher" name="publisher" />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Publication Date" id="publicationDate">
                    <Input
                        id="publicationDate"
                        name="publicationDate"
                        type="date"
                    />
                </FormField>
                <FormField label="DOI" id="doi">
                    <Input id="doi" name="doi" placeholder="10.xxxx/xxxxx" />
                </FormField>
                <FormField label="Indexed In" id="indexedIn">
                    <Input
                        id="indexedIn"
                        name="indexedIn"
                        placeholder="Scopus, Web of Science, etc."
                    />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} label="Publication proof (optional)" />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function ResearchForm({
    onSubmit,
    onCancel,
    isPending,
    userId,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <Input id="title" name="title" required />
                </FormField>
                <FormField label="Guide / Supervisor" id="guideName">
                    <Input id="guideName" name="guideName" />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" />
                </FormField>
                <FormField label="Status" id="status">
                    <select
                        id="status"
                        name="status"
                        className={selectBaseClass}
                    >
                        <option value="">Select status</option>
                        <option value="Planned">Planned</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                    </select>
                </FormField>
            </div>
            <FormField label="Description" id="description">
                <Textarea id="description" name="description" />
            </FormField>
            <EvidenceUploadField userId={userId} label="Research proof (optional)" />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    awards: MasterOption[];
    masterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="awardId"
                        name="awardId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select award</option>
                        {awards.map((award) => (
                            <option key={award._id} value={award._id}>
                                {award.title ?? award.name}
                                {award.category ? ` • ${award.category}` : ""}
                                {award.level ? ` • ${award.level}` : ""}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : awards.length === 0 ? (
                        <p className="text-xs text-amber-600">
                            No awards found. Ask admin to add master awards.
                        </p>
                    ) : null}
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Award Date" id="awardDate">
                    <Input id="awardDate" name="awardDate" type="date" />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    skills: MasterOption[];
    masterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="skillId"
                        name="skillId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select skill</option>
                        {skills.map((skill) => (
                            <option key={skill._id} value={skill._id}>
                                {skill.name ?? skill.title}
                                {skill.category ? ` • ${skill.category}` : ""}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : skills.length === 0 ? (
                        <p className="text-xs text-amber-600">
                            No skills found. Ask admin to add skill masters.
                        </p>
                    ) : null}
                </FormField>
                <FormField label="Provider / Platform" id="provider">
                    <Input
                        id="provider"
                        name="provider"
                        placeholder="Coursera, NPTEL, etc."
                    />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    sports: MasterOption[];
    masterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="sportId"
                        name="sportId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select sport</option>
                        {sports.map((sport) => (
                            <option key={sport._id} value={sport._id}>
                                {sport.sportName ?? sport.name ?? sport.title}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : sports.length === 0 ? (
                        <p className="text-xs text-amber-600">
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
                    />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Level" id="level">
                    <select
                        id="level"
                        name="level"
                        className={selectBaseClass}
                    >
                        <option value="">Select level</option>
                        <option value="College">College</option>
                        <option value="State">State</option>
                        <option value="National">National</option>
                        <option value="International">International</option>
                    </select>
                </FormField>
                <FormField label="Position / Rank" id="position">
                    <Input
                        id="position"
                        name="position"
                        placeholder="1st, Runner-up, etc."
                    />
                </FormField>
                <FormField label="Event Date" id="eventDate">
                    <Input id="eventDate" name="eventDate" type="date" />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    activities: MasterOption[];
    masterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="activityId"
                        name="activityId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select activity</option>
                        {activities.map((activity) => (
                            <option key={activity._id} value={activity._id}>
                                {activity.name ?? activity.title}
                                {activity.category ? ` • ${activity.category}` : ""}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : activities.length === 0 ? (
                        <p className="text-xs text-amber-600">
                            No activities found. Ask admin to add cultural masters.
                        </p>
                    ) : null}
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="Event Name" id="eventName">
                    <Input id="eventName" name="eventName" required />
                </FormField>
                <FormField label="Level" id="level">
                    <Input
                        id="level"
                        name="level"
                        placeholder="College, State, etc."
                    />
                </FormField>
                <FormField label="Position" id="position">
                    <Input
                        id="position"
                        name="position"
                        placeholder="Winner, Participant, etc."
                    />
                </FormField>
                <FormField label="Date" id="date">
                    <Input id="date" name="date" type="date" />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    events: MasterOption[];
    masterError: string | null;
}) {
    const [role, setRole] = useState("Participant");
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="eventId"
                        name="eventId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select event</option>
                        {events.map((event) => (
                            <option key={event._id} value={event._id}>
                                {event.title ?? event.name}
                                {event.eventType ? ` • ${event.eventType}` : ""}
                                {event.startDate ? ` • ${fmtDate(event.startDate)}` : ""}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : events.length === 0 ? (
                        <p className="text-xs text-amber-600">
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
                    />
                </FormField>
            )}
            <EvidenceUploadField userId={userId} />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
    programs: MasterOption[];
    masterError: string | null;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <select
                        id="programId"
                        name="programId"
                        required
                        className={selectBaseClass}
                    >
                        <option value="">Select program</option>
                        {programs.map((program) => (
                            <option key={program._id} value={program._id}>
                                {program.name ?? program.title}
                                {program.type ? ` • ${program.type}` : ""}
                            </option>
                        ))}
                    </select>
                    {masterError ? (
                        <p className="text-xs text-rose-600">{masterError}</p>
                    ) : programs.length === 0 ? (
                        <p className="text-xs text-amber-600">
                            No social programs found. Ask admin to add program masters.
                        </p>
                    ) : null}
                </FormField>
                <FormField label="Activity Name" id="activityName">
                    <Input id="activityName" name="activityName" required />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Hours Contributed" id="hoursContributed">
                    <Input
                        id="hoursContributed"
                        name="hoursContributed"
                        type="number"
                        min={0}
                    />
                </FormField>
                <FormField label="Date" id="date">
                    <Input id="date" name="date" type="date" />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}

function PlacementForm({
    onSubmit,
    onCancel,
    isPending,
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <Input id="companyName" name="companyName" required />
                </FormField>
                <FormField label="Job Role" id="jobRole">
                    <Input id="jobRole" name="jobRole" />
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
                    />
                </FormField>
                <FormField label="Offer Date" id="offerDate">
                    <Input id="offerDate" name="offerDate" type="date" />
                </FormField>
                <FormField label="Joining Date" id="joiningDate">
                    <Input id="joiningDate" name="joiningDate" type="date" />
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
}: {
    onSubmit: (d: AnyRecord) => void;
    onCancel: () => void;
    isPending: boolean;
    userId: string;
}) {
    return (
        <form
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
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
                    <Input id="companyName" name="companyName" required />
                </FormField>
                <FormField label="Role" id="role">
                    <Input id="role" name="role" />
                </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Start Date" id="startDate">
                    <Input id="startDate" name="startDate" type="date" />
                </FormField>
                <FormField label="End Date" id="endDate">
                    <Input id="endDate" name="endDate" type="date" />
                </FormField>
                <FormField label="Monthly Stipend" id="stipend">
                    <Input
                        id="stipend"
                        name="stipend"
                        type="number"
                        min={0}
                        placeholder="e.g. 15000"
                    />
                </FormField>
            </div>
            <EvidenceUploadField userId={userId} />
            <FormActions onCancel={onCancel} isPending={isPending} />
        </form>
    );
}
