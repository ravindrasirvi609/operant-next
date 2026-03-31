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
import type { LeadershipFacultyRecordsData, LeadershipFacultyRow } from "@/lib/director/dashboard";

type FacultyDialogTab = "overview" | "pbas" | "cas" | "aqar";

const dialogTabValues = new Set<FacultyDialogTab>(["overview", "pbas", "cas", "aqar"]);

function formatStatus(status?: string, period?: string) {
    if (!status) {
        return "No record";
    }

    return period ? `${status} (${period})` : status;
}

function statusTone(status?: string) {
    if (status === "Approved" || status === "Verified") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Rejected") {
        return "bg-rose-100 text-rose-700";
    }

    if (status === "Submitted" || status === "Under Review" || status === "Committee Review") {
        return "bg-amber-100 text-amber-800";
    }

    return "bg-zinc-100 text-zinc-700";
}

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

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "FA";
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

export function LeadershipFacultyRoster({ rows }: { rows: LeadershipFacultyRow[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [selectedFaculty, setSelectedFaculty] = useState<LeadershipFacultyRow | null>(null);
    const [activeTab, setActiveTab] = useState<FacultyDialogTab>("overview");
    const [recordsByFacultyId, setRecordsByFacultyId] = useState<Record<string, LeadershipFacultyRecordsData>>({});
    const [recordsErrorByFacultyId, setRecordsErrorByFacultyId] = useState<Record<string, string>>({});
    const [loadingFacultyId, setLoadingFacultyId] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);

    const filteredRows = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        return rows.filter((row) =>
            [
                row.facultyName,
                row.employeeCode,
                row.designation,
                row.email,
                row.mobile,
                row.departmentName,
                row.institutionName,
                row.status,
                row.accountStatus,
                row.employmentType,
                row.highestQualification,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [deferredSearch, rows]);

    const attentionCount = filteredRows.filter((row) => row.needsAttention).length;
    const selectedFacultyId = selectedFaculty?.facultyId;
    const selectedRecords = selectedFacultyId ? recordsByFacultyId[selectedFacultyId] : undefined;
    const selectedRecordsError = selectedFacultyId ? recordsErrorByFacultyId[selectedFacultyId] : undefined;
    const isLoadingRecords = Boolean(
        selectedFacultyId &&
        loadingFacultyId === selectedFacultyId &&
        !selectedRecords
    );
    const currentDialogRoute = selectedFacultyId
        ? `${pathname}?facultyId=${selectedFacultyId}&facultyTab=${activeTab}`
        : pathname;

    useEffect(() => {
        const routeFacultyId = searchParams.get("facultyId");
        const routeTab = searchParams.get("facultyTab");

        if (routeTab && dialogTabValues.has(routeTab as FacultyDialogTab)) {
            setActiveTab(routeTab as FacultyDialogTab);
        }

        if (!routeFacultyId) {
            setSelectedFaculty((current) => (current ? null : current));
            return;
        }

        const matchedFaculty = rows.find((row) => row.facultyId === routeFacultyId);
        if (!matchedFaculty) {
            return;
        }

        setSelectedFaculty((current) =>
            current?.facultyId === matchedFaculty.facultyId ? current : matchedFaculty
        );
    }, [searchParams, rows]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        const routeFacultyId = params.get("facultyId");
        const routeTab = params.get("facultyTab");

        if (!selectedFacultyId) {
            if (!routeFacultyId && !routeTab) {
                return;
            }

            params.delete("facultyId");
            params.delete("facultyTab");
        } else {
            if (routeFacultyId === selectedFacultyId && routeTab === activeTab) {
                return;
            }

            params.set("facultyId", selectedFacultyId);
            params.set("facultyTab", activeTab);
        }

        const nextRoute = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextRoute, { scroll: false });
    }, [selectedFacultyId, activeTab, pathname, router, searchParams]);

    useEffect(() => {
        if (!selectedFacultyId) {
            return;
        }

        if (recordsByFacultyId[selectedFacultyId]) {
            return;
        }

        let disposed = false;
        const controller = new AbortController();

        setLoadingFacultyId(selectedFacultyId);

        const loadFacultyRecords = async () => {
            try {
                const response = await fetch(`/api/director/faculty/${selectedFacultyId}/records`, {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });

                const payload = (await response.json()) as {
                    records?: LeadershipFacultyRecordsData;
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(payload.message ?? "Unable to load faculty records.");
                }

                if (disposed || !payload.records) {
                    return;
                }

                setRecordsByFacultyId((current) => ({
                    ...current,
                    [selectedFacultyId]: payload.records,
                }));
                setRecordsErrorByFacultyId((current) => {
                    if (!current[selectedFacultyId]) {
                        return current;
                    }

                    const next = { ...current };
                    delete next[selectedFacultyId];
                    return next;
                });
            } catch (error) {
                if (disposed) {
                    return;
                }

                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                setRecordsErrorByFacultyId((current) => ({
                    ...current,
                    [selectedFacultyId]:
                        error instanceof Error
                            ? error.message
                            : "Unable to load faculty records.",
                }));
            } finally {
                if (!disposed) {
                    setLoadingFacultyId((current) =>
                        current === selectedFacultyId ? null : current
                    );
                }
            }
        };

        void loadFacultyRecords();

        return () => {
            disposed = true;
            controller.abort();
        };
    }, [selectedFacultyId, recordsByFacultyId]);

    function renderRecordsTab(content: (records: LeadershipFacultyRecordsData) => ReactNode) {
        if (isLoadingRecords) {
            return <RecordsLoadingState />;
        }

        if (selectedRecordsError) {
            return <RecordsErrorState message={selectedRecordsError} />;
        }

        if (!selectedRecords) {
            return (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
                    Open a faculty profile to load records.
                </div>
            );
        }

        return content(selectedRecords);
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Faculty in scope" value={String(filteredRows.length)} />
                <MetricCard label="Need attention" value={String(attentionCount)} />
                <MetricCard
                    label="Up to date"
                    value={String(Math.max(filteredRows.length - attentionCount, 0))}
                />
            </div>

            <Card className="overflow-hidden border-zinc-200 shadow-sm">
                <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle>Faculty roster</CardTitle>
                        <CardDescription>
                            Track faculty-wise submission health across PBAS, CAS, and AQAR inside your authorized scope.
                        </CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search faculty, department, email, employee code, or status"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredRows.length ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Faculty</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Profile</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>PBAS</TableHead>
                                        <TableHead>CAS</TableHead>
                                        <TableHead>AQAR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRows.map((row) => (
                                        <TableRow key={row.facultyId} className="hover:bg-zinc-50/80">
                                            <TableCell className="align-top">
                                                <div className="flex items-start gap-3">
                                                    <ProfileAvatar name={row.facultyName} photoURL={row.photoURL} />
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFaculty(row)}
                                                            className="cursor-pointer text-left text-sm font-semibold text-zinc-950 underline-offset-4 hover:text-zinc-700 hover:underline"
                                                        >
                                                            {row.facultyName}
                                                        </button>
                                                        <div className="text-xs text-zinc-500">
                                                            {row.employeeCode} • {row.designation}
                                                        </div>
                                                        {row.highestQualification ? (
                                                            <div className="text-xs text-zinc-500">
                                                                Qualification: {row.highestQualification}
                                                            </div>
                                                        ) : null}
                                                        {row.email ? (
                                                            <div className="text-xs text-zinc-500">{row.email}</div>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFaculty(row)}
                                                            className="mt-1 cursor-pointer text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
                                                        >
                                                            View full profile
                                                        </button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="font-medium text-zinc-900">{row.departmentName ?? "-"}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {row.institutionName ?? "Institution not mapped"}
                                                </div>
                                                {row.needsAttention ? (
                                                    <Badge className="mt-2 bg-amber-100 text-amber-800">
                                                        Needs attention
                                                    </Badge>
                                                ) : (
                                                    <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                                                        Stable
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="text-sm text-zinc-700">
                                                    {row.employmentType ?? "Employment type not set"}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    Experience: {typeof row.experienceYears === "number" ? `${row.experienceYears} year(s)` : "-"}
                                                </div>
                                                <div className="text-xs text-zinc-500">Contact: {row.mobile ?? "-"}</div>
                                            </TableCell>
                                            <TableCell className="align-top space-y-2">
                                                <Badge className={statusTone(row.status)}>{row.status}</Badge>
                                                <br />
                                                <Badge className={accountTone(row.accountStatus)}>
                                                    {row.accountStatus ?? "Account status unavailable"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Badge className={statusTone(row.pbasStatus)}>
                                                    {formatStatus(row.pbasStatus, row.pbasAcademicYear)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Badge className={statusTone(row.casStatus)}>
                                                    {formatStatus(row.casStatus, row.casApplicationYear)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Badge className={statusTone(row.aqarStatus)}>
                                                    {formatStatus(row.aqarStatus, row.aqarAcademicYear)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No faculty records matched this search.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={Boolean(selectedFaculty)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedFaculty(null);
                    }
                }}
            >
                {selectedFaculty ? (
                    <DialogContent className="h-[96vh] w-[98vw] max-w-[98vw] sm:max-w-[98vw] overflow-y-auto border-zinc-200 p-0">
                        <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 p-6 text-white">
                            <DialogHeader className="space-y-3 text-left">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-4">
                                        <ProfileAvatar
                                            name={selectedFaculty.facultyName}
                                            photoURL={selectedFaculty.photoURL}
                                            size="lg"
                                        />
                                        <div>
                                            <DialogTitle className="text-2xl text-white">
                                                {selectedFaculty.facultyName}
                                            </DialogTitle>
                                            <DialogDescription className="text-zinc-200">
                                                {selectedFaculty.employeeCode} • {selectedFaculty.departmentName ?? "Department not mapped"}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <div className="space-x-2">
                                        <Badge className={statusTone(selectedFaculty.status)}>
                                            {selectedFaculty.status}
                                        </Badge>
                                        <Badge className={accountTone(selectedFaculty.accountStatus)}>
                                            {selectedFaculty.accountStatus ?? "Account status unavailable"}
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
                                    if (dialogTabValues.has(value as FacultyDialogTab)) {
                                        setActiveTab(value as FacultyDialogTab);
                                    }
                                }}
                            >
                                <div className="overflow-x-auto pb-1">
                                    <TabsList className="w-max">
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="pbas">PBAS</TabsTrigger>
                                        <TabsTrigger value="cas">CAS</TabsTrigger>
                                        <TabsTrigger value="aqar">AQAR</TabsTrigger>
                                    </TabsList>
                                </div>

                      

                                <TabsContent value="overview" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <>
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                <ProfileInfo label="Designation" value={selectedFaculty.designation} />
                                                <ProfileInfo label="Employment Type" value={selectedFaculty.employmentType ?? "-"} />
                                                <ProfileInfo
                                                    label="Experience"
                                                    value={typeof selectedFaculty.experienceYears === "number" ? `${selectedFaculty.experienceYears} year(s)` : "-"}
                                                />
                                                <ProfileInfo label="Qualification" value={selectedFaculty.highestQualification ?? "-"} />
                                                <ProfileInfo label="Email" value={selectedFaculty.email ?? "Email not available"} />
                                                <ProfileInfo label="Mobile" value={selectedFaculty.mobile ?? "Phone not available"} />
                                                <ProfileInfo label="Department" value={selectedFaculty.departmentName ?? "-"} />
                                                <ProfileInfo label="Institution" value={selectedFaculty.institutionName ?? "-"} />
                                                <ProfileInfo label="Last Login" value={formatDateTime(selectedFaculty.lastLoginAt)} />
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                                <RecordMetric label="PBAS" value={records.summary.pbas} />
                                                <RecordMetric label="CAS" value={records.summary.cas} />
                                                <RecordMetric label="AQAR" value={records.summary.aqar} />
                                                <RecordMetric label="Pending" value={records.summary.pending} />
                                                <RecordMetric label="Approved" value={records.summary.approved} />
                                                <RecordMetric label="Rejected" value={records.summary.rejected} />
                                            </div>
                                        </>
                                    ))}
                                </TabsContent>

                                <TabsContent value="pbas" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <SectionCard
                                            title="PBAS Applications"
                                            description="Academic-year-wise PBAS submissions and review progression."
                                        >
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Academic Year</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Submission</TableHead>
                                                        <TableHead>Reviews</TableHead>
                                                        <TableHead>Submitted</TableHead>
                                                        <TableHead>Updated</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.pbas.length ? (
                                                        records.pbas.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell>{item.academicYear}</TableCell>
                                                                <TableCell>{item.status}</TableCell>
                                                                <TableCell>{item.submissionStatus}</TableCell>
                                                                <TableCell>{item.reviewCount}</TableCell>
                                                                <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                                                                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
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

                                <TabsContent value="cas" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <SectionCard
                                            title="CAS Applications"
                                            description="Promotion applications and eligibility context by year."
                                        >
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Application Year</TableHead>
                                                        <TableHead>Designation Move</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>API Score</TableHead>
                                                        <TableHead>Experience</TableHead>
                                                        <TableHead>Submitted</TableHead>
                                                        <TableHead>Updated</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.cas.length ? (
                                                        records.cas.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell>{item.applicationYear}</TableCell>
                                                                <TableCell>
                                                                    {item.currentDesignation} to {item.applyingForDesignation}
                                                                </TableCell>
                                                                <TableCell>{item.status}</TableCell>
                                                                <TableCell>{item.apiScore ?? "-"}</TableCell>
                                                                <TableCell>
                                                                    {typeof item.experienceYears === "number" ? `${item.experienceYears} year(s)` : "-"}
                                                                </TableCell>
                                                                <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                                                                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <EmptyTableRow colSpan={7} />
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </SectionCard>
                                    ))}
                                </TabsContent>

                                <TabsContent value="aqar" className="space-y-4">
                                    {renderRecordsTab((records) => (
                                        <SectionCard
                                            title="AQAR Applications"
                                            description="Faculty AQAR contribution snapshots by reporting year."
                                        >
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Academic Year</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Contribution Index</TableHead>
                                                        <TableHead>Research Papers</TableHead>
                                                        <TableHead>Patents</TableHead>
                                                        <TableHead>Submitted</TableHead>
                                                        <TableHead>Updated</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.aqar.length ? (
                                                        records.aqar.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell>{item.academicYear}</TableCell>
                                                                <TableCell>{item.status}</TableCell>
                                                                <TableCell>{item.contributionIndex ?? "-"}</TableCell>
                                                                <TableCell>{item.researchPaperCount ?? "-"}</TableCell>
                                                                <TableCell>{item.patentCount ?? "-"}</TableCell>
                                                                <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                                                                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <EmptyTableRow colSpan={7} />
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </SectionCard>
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

function ProfileInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}
