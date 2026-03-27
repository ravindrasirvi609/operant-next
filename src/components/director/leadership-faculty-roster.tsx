"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeadershipFacultyRow = {
    facultyId: string;
    facultyName: string;
    employeeCode: string;
    designation: string;
    email?: string;
    departmentName?: string;
    institutionName?: string;
    status: string;
    pbasStatus?: string;
    pbasAcademicYear?: string;
    casStatus?: string;
    casApplicationYear?: string;
    aqarStatus?: string;
    aqarAcademicYear?: string;
    needsAttention: boolean;
};

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

export function LeadershipFacultyRoster({ rows }: { rows: LeadershipFacultyRow[] }) {
    const [search, setSearch] = useState("");
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
                row.departmentName,
                row.institutionName,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [deferredSearch, rows]);

    const attentionCount = filteredRows.filter((row) => row.needsAttention).length;

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

            <Card>
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
                            placeholder="Search faculty, department, email, or employee code"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredRows.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Faculty</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>PBAS</TableHead>
                                    <TableHead>CAS</TableHead>
                                    <TableHead>AQAR</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.map((row) => (
                                    <TableRow key={row.facultyId}>
                                        <TableCell className="align-top">
                                            <div className="font-medium text-zinc-950">{row.facultyName}</div>
                                            <div className="text-xs text-zinc-500">
                                                {row.employeeCode} • {row.designation}
                                            </div>
                                            {row.email ? (
                                                <div className="text-xs text-zinc-500">{row.email}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="font-medium text-zinc-900">
                                                {row.departmentName ?? "-"}
                                            </div>
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
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No faculty records matched this search.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}
