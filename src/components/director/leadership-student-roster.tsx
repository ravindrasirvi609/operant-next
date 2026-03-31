"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeadershipStudentRecordsData, LeadershipStudentRow } from "@/lib/director/dashboard";

type StudentDialogTab =
    | "overview"
    | "academics"
    | "research"
    | "achievements"
    | "activities"
    | "career";

const dialogTabValues = new Set<StudentDialogTab>([
    "overview",
    "academics",
    "research",
    "achievements",
    "activities",
    "career",
]);

function accountTone(status?: string) {
    if (status === "Active") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "PendingActivation") {
        return "bg-amber-100 text-amber-800";
    }

    if (status === "Suspended") {
        return "bg-rose-100 text-rose-700";
    }

    return "bg-zinc-100 text-zinc-700";
}

function studentStatusTone(status?: string) {
    if (status === "Active") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Inactive") {
        return "bg-zinc-100 text-zinc-700";
    }

    if (status === "Dropped") {
        return "bg-rose-100 text-rose-700";
    }

    if (status === "Graduated") {
        return "bg-sky-100 text-sky-700";
    }

    return "bg-zinc-100 text-zinc-700";
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

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "ST";
    }

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function ProfileAvatar({
    name,
    photoURL,
    size = "md",
}: {
    name: string;
    photoURL?: string;
    size?: "md" | "lg";
}) {
    const dimensions = size === "lg" ? "size-20" : "size-11";
    const imageSize = size === "lg" ? 80 : 44;

    if (photoURL) {
        return (
            <Image
                src={photoURL}
                alt={`${name} profile`}
                width={imageSize}
                height={imageSize}
                unoptimized
                className={`${dimensions} rounded-full border border-zinc-200 object-cover shadow-sm`}
            />
        );
    }

    return (
        <div
            className={`${dimensions} flex items-center justify-center rounded-full border border-zinc-300 bg-gradient-to-br from-zinc-100 to-zinc-200 text-xs font-semibold text-zinc-700`}
        >
            {initials(name)}
        </div>
    );
}

export function LeadershipStudentRoster({ rows }: { rows: LeadershipStudentRow[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<LeadershipStudentRow | null>(null);
    const [activeTab, setActiveTab] = useState<StudentDialogTab>("overview");
    const [recordsByStudentId, setRecordsByStudentId] = useState<Record<string, LeadershipStudentRecordsData>>({});
    const [recordsErrorByStudentId, setRecordsErrorByStudentId] = useState<Record<string, string>>({});
    const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);
    const queryString = searchParams.toString();

    const filteredRows = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        return rows.filter((row) =>
            [
                row.studentName,
                row.enrollmentNo,
                row.email,
                row.mobile,
                row.departmentName,
                row.programName,
                row.institutionName,
                row.gender,
                row.address,
                row.status,
                row.accountStatus,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [deferredSearch, rows]);

    const activeStudents = filteredRows.filter((row) => row.status === "Active").length;
    const pendingActivation = filteredRows.filter((row) => row.accountStatus === "PendingActivation").length;
    const selectedStudentId = selectedStudent?.studentId;
    const selectedRecords = selectedStudentId ? recordsByStudentId[selectedStudentId] : undefined;
    const selectedRecordsError = selectedStudentId ? recordsErrorByStudentId[selectedStudentId] : undefined;
    const isLoadingRecords = Boolean(
        selectedStudentId &&
        loadingStudentId === selectedStudentId &&
        !selectedRecords
    );
    const currentDialogRoute = selectedStudentId
        ? `${pathname}?studentId=${selectedStudentId}&tab=${activeTab}`
        : pathname;
    const routeStudentId = searchParams.get("studentId");
    const routeTab = searchParams.get("tab");

    useEffect(() => {
        if (routeTab && dialogTabValues.has(routeTab as StudentDialogTab)) {
            const nextTab = routeTab as StudentDialogTab;
            setActiveTab((current) => (current === nextTab ? current : nextTab));
        }

        if (!routeStudentId) {
            setSelectedStudent((current) => (current ? null : current));
            return;
        }

        const matchedStudent = rows.find((row) => row.studentId === routeStudentId);
        if (!matchedStudent) {
            return;
        }

        setSelectedStudent((current) =>
            current?.studentId === matchedStudent.studentId ? current : matchedStudent
        );
    }, [routeStudentId, routeTab, rows]);

    useEffect(() => {
        const params = new URLSearchParams(queryString);
        const currentRouteStudentId = params.get("studentId");
        const currentRouteTab = params.get("tab");

        if (!selectedStudentId) {
            if (!currentRouteStudentId && !currentRouteTab) {
                return;
            }

            params.delete("studentId");
            params.delete("tab");
        } else {
            if (currentRouteStudentId === selectedStudentId && currentRouteTab === activeTab) {
                return;
            }

            params.set("studentId", selectedStudentId);
            params.set("tab", activeTab);
        }

        const nextRoute = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextRoute, { scroll: false });
    }, [selectedStudentId, activeTab, pathname, router, queryString]);

    useEffect(() => {
        if (!selectedStudentId) {
            return;
        }

        const studentId = selectedStudentId;

        if (loadingStudentId === studentId) {
            return;
        }

        if (recordsByStudentId[studentId]) {
            return;
        }

        let disposed = false;
        const controller = new AbortController();

        setLoadingStudentId(studentId);

        const loadStudentRecords = async () => {
            try {
                const response = await fetch(`/api/director/students/${studentId}/records`, {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });

                const payload = (await response.json()) as {
                    records?: LeadershipStudentRecordsData;
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(payload.message ?? "Unable to load student records.");
                }

                if (disposed || !payload.records) {
                    return;
                }

                setRecordsByStudentId((current) => ({
                    ...current,
                    [studentId]: payload.records as LeadershipStudentRecordsData,
                }));
                setRecordsErrorByStudentId((current) => {
                    if (!current[studentId]) {
                        return current;
                    }

                    const next = { ...current };
                    delete next[studentId];
                    return next;
                });
            } catch (error) {
                if (disposed) {
                    return;
                }

                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                setRecordsErrorByStudentId((current) => ({
                    ...current,
                    [studentId]:
                        error instanceof Error
                            ? error.message
                            : "Unable to load student records.",
                }));
            } finally {
                if (!disposed) {
                    setLoadingStudentId((current) =>
                        current === studentId ? null : current
                    );
                }
            }
        };

        void loadStudentRecords();

        return () => {
            disposed = true;
            controller.abort();
        };
    }, [selectedStudentId, loadingStudentId, recordsByStudentId]);

    function renderRecordsTab(content: (records: LeadershipStudentRecordsData) => ReactNode) {
        if (isLoadingRecords) {
            return <RecordsLoadingState />;
        }

        if (selectedRecordsError) {
            return <RecordsErrorState message={selectedRecordsError} />;
        }

        if (!selectedRecords) {
            return (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
                    Open a student profile to load records.
                </div>
            );
        }

        return content(selectedRecords);
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Students in scope" value={String(filteredRows.length)} />
                <MetricCard label="Active students" value={String(activeStudents)} />
                <MetricCard label="Pending activation" value={String(pendingActivation)} />
            </div>

            <Card className="overflow-hidden border-zinc-200 shadow-sm">
                <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle>Department student roster</CardTitle>
                        <CardDescription>
                            Click a student name to open the complete profile. Only students from your authorized
                            departments are shown.
                        </CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search student, enrollment, department, program, email, or status"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredRows.length ? (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Academic</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.map((row) => (
                                    <TableRow key={row.studentId} className="hover:bg-zinc-50/80">
                                        <TableCell className="align-top">
                                            <div className="flex items-start gap-3">
                                                <ProfileAvatar
                                                    name={row.studentName}
                                                    photoURL={row.photoURL}
                                                />
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedStudent(row)}
                                                        className="cursor-pointer text-left text-sm font-semibold text-zinc-950 underline-offset-4 hover:text-zinc-700 hover:underline"
                                                    >
                                                        {row.studentName}
                                                    </button>
                                                    <div className="text-xs text-zinc-500">{row.enrollmentNo}</div>
                                                    <div className="text-xs text-zinc-500">
                                                        {row.email ?? "Email not available"}
                                                    </div>
                                                    <div className="text-xs text-zinc-500">
                                                        {row.mobile ?? "Phone not available"}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedStudent(row)}
                                                        className="mt-1 cursor-pointer text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
                                                    >
                                                        View full profile
                                                    </button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="font-medium text-zinc-900">{row.departmentName ?? "-"}</div>
                                            <div className="text-xs text-zinc-500">{row.programName ?? "Program not mapped"}</div>
                                            <div className="text-xs text-zinc-500">{row.institutionName ?? "Institution not mapped"}</div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="text-sm text-zinc-700">Admission year: {row.admissionYear}</div>
                                            <div className="text-xs text-zinc-500">
                                                Last portal login: {formatDateTime(row.lastLoginAt)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top space-y-2">
                                            <Badge className={studentStatusTone(row.status)}>{row.status}</Badge>
                                            <br />
                                            <Badge className={accountTone(row.accountStatus)}>
                                                {row.accountStatus ?? "Account status unavailable"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No student records matched this search.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={Boolean(selectedStudent)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedStudent(null);
                    }
                }}
            >
                {selectedStudent ? (
                    <DialogContent className="h-[96vh] w-[98vw] max-w-[98vw] sm:max-w-[98vw] overflow-y-auto border-zinc-200 p-0">
                        <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 p-6 text-white">
                            <DialogHeader className="space-y-3 text-left">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-4">
                                        <ProfileAvatar
                                            name={selectedStudent.studentName}
                                            photoURL={selectedStudent.photoURL}
                                            size="lg"
                                        />
                                        <div>
                                            <DialogTitle className="text-2xl text-white">
                                                {selectedStudent.studentName}
                                            </DialogTitle>
                                            <DialogDescription className="text-zinc-200">
                                                {selectedStudent.enrollmentNo} • {selectedStudent.departmentName ?? "Department not mapped"}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <div className="space-x-2">
                                        <Badge className={studentStatusTone(selectedStudent.status)}>
                                            {selectedStudent.status}
                                        </Badge>
                                        <Badge className={accountTone(selectedStudent.accountStatus)}>
                                            {selectedStudent.accountStatus ?? "Account status unavailable"}
                                        </Badge>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="p-6 pt-4">
                            <Tabs
                                className="gap-4"
                                value={activeTab}
                                onValueChange={(value) => {
                                    if (dialogTabValues.has(value as StudentDialogTab)) {
                                        setActiveTab(value as StudentDialogTab);
                                    }
                                }}
                            >
                                <div className="overflow-x-auto pb-1">
                                    <TabsList className="w-max">
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="academics">Academics</TabsTrigger>
                                        <TabsTrigger value="research">Research</TabsTrigger>
                                        <TabsTrigger value="achievements">Achievements</TabsTrigger>
                                        <TabsTrigger value="activities">Activities</TabsTrigger>
                                        <TabsTrigger value="career">Career</TabsTrigger>
                                    </TabsList>
                                </div>


                                <TabsContent value="overview" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <ProfileInfo label="Email" value={selectedStudent.email ?? "Email not available"} />
                                                <ProfileInfo label="Mobile" value={selectedStudent.mobile ?? "Phone not available"} />
                                                <ProfileInfo label="Program" value={selectedStudent.programName ?? "Program not mapped"} />
                                                <ProfileInfo label="Institution" value={selectedStudent.institutionName ?? "Institution not mapped"} />
                                                <ProfileInfo label="Admission Year" value={String(selectedStudent.admissionYear)} />
                                                <ProfileInfo label="Gender" value={selectedStudent.gender ?? "-"} />
                                                <ProfileInfo label="Date Of Birth" value={formatDate(selectedStudent.dob)} />
                                                <ProfileInfo label="Last Login" value={formatDateTime(selectedStudent.lastLoginAt)} />
                                                <div className="md:col-span-2">
                                                    <ProfileInfo label="Address" value={selectedStudent.address ?? "Address not available"} />
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                                <RecordMetric label="Academic" value={records.summary.academics} />
                                                <RecordMetric label="Research" value={records.summary.publications + records.summary.researchProjects} />
                                                <RecordMetric label="Awards" value={records.summary.awards} />
                                                <RecordMetric label="Activities" value={records.summary.sports + records.summary.cultural + records.summary.events + records.summary.social} />
                                                <RecordMetric label="Career" value={records.summary.internships + records.summary.placements} />
                                                <RecordMetric label="Total" value={records.summary.total} />
                                            </div>
                                        </>
                                    ))}
                                </TabsContent>

                                <TabsContent value="academics" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <SectionCard
                                            title="Academic Records"
                                            description="Semester-wise academic performance within this student profile."
                                        >
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Semester</TableHead>
                                                        <TableHead>SGPA</TableHead>
                                                        <TableHead>CGPA</TableHead>
                                                        <TableHead>Percentage</TableHead>
                                                        <TableHead>Rank</TableHead>
                                                        <TableHead>Result</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.academics.length ? (
                                                        records.academics.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell>{item.semester}</TableCell>
                                                                <TableCell>{item.sgpa ?? "-"}</TableCell>
                                                                <TableCell>{item.cgpa ?? "-"}</TableCell>
                                                                <TableCell>{item.percentage ?? "-"}</TableCell>
                                                                <TableCell>{item.rank ?? "-"}</TableCell>
                                                                <TableCell>{item.resultStatus ?? "-"}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <EmptyTableRow colSpan={6} />
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </SectionCard>
                                    ))}
                                </TabsContent>

                                <TabsContent value="research" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <SectionCard
                                                title="Publications"
                                                description="Journals, conferences, and publication evidence."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Title</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Journal / Publisher</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>DOI / Indexed</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.publications.length ? (
                                                            records.publications.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.title}</TableCell>
                                                                    <TableCell>{item.publicationType ?? "-"}</TableCell>
                                                                    <TableCell>
                                                                        {item.journalName ?? item.publisher ?? "-"}
                                                                    </TableCell>
                                                                    <TableCell>{formatDate(item.publicationDate)}</TableCell>
                                                                    <TableCell>{item.doi ?? item.indexedIn ?? "-"}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={6} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Research Projects"
                                                description="Student research work and project lifecycle."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Title</TableHead>
                                                            <TableHead>Guide</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Timeline</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.researchProjects.length ? (
                                                            records.researchProjects.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.title}</TableCell>
                                                                    <TableCell>{item.guideName ?? "-"}</TableCell>
                                                                    <TableCell>{item.status ?? "-"}</TableCell>
                                                                    <TableCell>
                                                                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>
                                        </>
                                    ))}
                                </TabsContent>

                                <TabsContent value="achievements" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <SectionCard
                                                title="Awards"
                                                description="Recognitions and award-level achievements."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Award</TableHead>
                                                            <TableHead>Category / Level</TableHead>
                                                            <TableHead>Organizing Body</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.awards.length ? (
                                                            records.awards.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.title}</TableCell>
                                                                    <TableCell>
                                                                        {item.category ?? "-"} / {item.level ?? "-"}
                                                                    </TableCell>
                                                                    <TableCell>{item.organizingBody ?? "-"}</TableCell>
                                                                    <TableCell>{formatDate(item.awardDate)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Skills"
                                                description="Skill development records with provider and dates."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Skill</TableHead>
                                                            <TableHead>Category</TableHead>
                                                            <TableHead>Provider</TableHead>
                                                            <TableHead>Duration</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.skills.length ? (
                                                            records.skills.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.name}</TableCell>
                                                                    <TableCell>{item.category ?? "-"}</TableCell>
                                                                    <TableCell>{item.provider ?? "-"}</TableCell>
                                                                    <TableCell>
                                                                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>
                                        </>
                                    ))}
                                </TabsContent>

                                <TabsContent value="activities" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <SectionCard
                                                title="Sports"
                                                description="Sports events, levels, and positions."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Sport</TableHead>
                                                            <TableHead>Event</TableHead>
                                                            <TableHead>Level</TableHead>
                                                            <TableHead>Position</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.sports.length ? (
                                                            records.sports.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.sportName}</TableCell>
                                                                    <TableCell>{item.eventName}</TableCell>
                                                                    <TableCell>{item.level ?? "-"}</TableCell>
                                                                    <TableCell>{item.position ?? "-"}</TableCell>
                                                                    <TableCell>{formatDate(item.eventDate)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={6} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Cultural Activities"
                                                description="Cultural events and participation details."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Activity</TableHead>
                                                            <TableHead>Event</TableHead>
                                                            <TableHead>Level / Position</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.cultural.length ? (
                                                            records.cultural.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.activityName}</TableCell>
                                                                    <TableCell>{item.eventName}</TableCell>
                                                                    <TableCell>
                                                                        {item.level ?? "-"} / {item.position ?? "-"}
                                                                    </TableCell>
                                                                    <TableCell>{formatDate(item.date)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Event Participation"
                                                description="Workshops, conferences, and presenter/participant records."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Event</TableHead>
                                                            <TableHead>Role</TableHead>
                                                            <TableHead>Organizer</TableHead>
                                                            <TableHead>Paper</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.events.length ? (
                                                            records.events.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.title}</TableCell>
                                                                    <TableCell>{item.role}</TableCell>
                                                                    <TableCell>{item.organizedBy ?? "-"}</TableCell>
                                                                    <TableCell>{item.paperTitle ?? "-"}</TableCell>
                                                                    <TableCell>{formatDate(item.eventDate)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={6} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Social Participation"
                                                description="NSS, NCC, extension, and social engagement records."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Program</TableHead>
                                                            <TableHead>Activity</TableHead>
                                                            <TableHead>Hours</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.social.length ? (
                                                            records.social.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>
                                                                        {item.programName}
                                                                        <div className="text-xs text-zinc-500">
                                                                            {item.programType ?? "-"}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>{item.activityName}</TableCell>
                                                                    <TableCell>{item.hoursContributed ?? "-"}</TableCell>
                                                                    <TableCell>{formatDate(item.date)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>
                                        </>
                                    ))}
                                </TabsContent>

                                <TabsContent value="career" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <SectionCard
                                                title="Internships"
                                                description="Company internships with role, stipend, and dates."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Company</TableHead>
                                                            <TableHead>Role</TableHead>
                                                            <TableHead>Duration</TableHead>
                                                            <TableHead>Stipend</TableHead>
                                                            <TableHead>Evidence</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.internships.length ? (
                                                            records.internships.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.companyName}</TableCell>
                                                                    <TableCell>{item.role ?? "-"}</TableCell>
                                                                    <TableCell>
                                                                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                                                    </TableCell>
                                                                    <TableCell>{formatCurrency(item.stipend)}</TableCell>
                                                                    <TableCell>
                                                                        <DocumentBadge document={item.document} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>

                                            <SectionCard
                                                title="Placements"
                                                description="Placement outcomes and joining details."
                                            >
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Company</TableHead>
                                                            <TableHead>Job Role</TableHead>
                                                            <TableHead>Package</TableHead>
                                                            <TableHead>Offer Date</TableHead>
                                                            <TableHead>Joining Date</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {records.placements.length ? (
                                                            records.placements.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>{item.companyName}</TableCell>
                                                                    <TableCell>{item.jobRole ?? "-"}</TableCell>
                                                                    <TableCell>{formatCurrency(item.package)}</TableCell>
                                                                    <TableCell>{formatDate(item.offerDate)}</TableCell>
                                                                    <TableCell>{formatDate(item.joiningDate)}</TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <EmptyTableRow colSpan={5} />
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </SectionCard>
                                        </>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </DialogContent>
                ) : null}
            </Dialog>
        </div>
    );
}

function RecordsLoadingState() {
    return (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-40 w-full" />
        </div>
    );
}

function RecordsErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {message}
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card className="border-zinc-200 shadow-none">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function RecordMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function EmptyTableRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow>
            <TableCell className="py-6 text-center text-sm text-zinc-500" colSpan={colSpan}>
                No records found.
            </TableCell>
        </TableRow>
    );
}

function DocumentBadge({
    document,
}: {
    document?: {
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
}) {
    if (!document) {
        return <span className="text-xs text-zinc-400">-</span>;
    }

    return (
        <div className="flex flex-col gap-1">
            {document.fileUrl ? (
                <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline"
                >
                    {document.fileName ?? "View file"}
                </a>
            ) : (
                <span className="text-xs text-zinc-500">{document.fileName ?? "Document"}</span>
            )}
            <Badge className={evidenceTone(document.verificationStatus)}>
                {document.verificationStatus ?? "Pending"}
            </Badge>
        </div>
    );
}

function evidenceTone(status?: string) {
    if (status === "Verified") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Rejected") {
        return "bg-rose-100 text-rose-700";
    }

    return "bg-amber-100 text-amber-800";
}

function formatCurrency(value?: number) {
    if (typeof value !== "number") {
        return "-";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}
