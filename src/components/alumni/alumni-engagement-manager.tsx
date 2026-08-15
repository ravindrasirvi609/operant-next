"use client";

import { useEffect, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

const CONTRIBUTION_BAND_LABELS: Record<string, string> = {
    Below5Lakhs: "< 5 Lakhs",
    "5To20Lakhs": "5 - 20 Lakhs",
    "20To50Lakhs": "20 - 50 Lakhs",
    "50To100Lakhs": "50 - 100 Lakhs",
    Above100Lakhs: "> 100 Lakhs",
};

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
        ...options,
    });
    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }
    return data;
}

export function AlumniEngagementManager() {
    const [console_, setConsole] = useState<AnyRecord | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
    const [associationForm, setAssociationForm] = useState({
        name: "",
        isRegistered: false,
        isFunctional: false,
        description: "",
    });
    const [contributionForm, setContributionForm] = useState({
        associationId: "",
        alumniId: "",
        alumniName: "",
        contributionType: "Financial",
        contributionBand: "Below5Lakhs",
        contributionYear: String(new Date().getFullYear()),
        amount: "",
        purposeDescription: "",
    });

    function refresh() {
        requestJson<AnyRecord>("/api/admin/alumni/console")
            .then((data) => setConsole(data))
            .catch(() => setMessage({ type: "error", text: "Unable to load alumni console." }));
    }

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (!selectedInstitutionId) return;
        const existing = (console_?.associations ?? []).find(
            (item: AnyRecord) => item.institutionId?.toString() === selectedInstitutionId
        );
        setAssociationForm({
            name: existing?.name ?? "",
            isRegistered: Boolean(existing?.isRegistered),
            isFunctional: Boolean(existing?.isFunctional),
            description: existing?.description ?? "",
        });
    }, [selectedInstitutionId, console_]);

    function promoteStudent(studentId: string) {
        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson("/api/admin/alumni/promote", {
                    method: "POST",
                    body: JSON.stringify({ studentId }),
                });
                setMessage({ type: "success", text: "Student promoted to alumni." });
                refresh();
            } catch (error) {
                setMessage({ type: "error", text: error instanceof Error ? error.message : "Promotion failed." });
            }
        });
    }

    function promoteAllGraduated() {
        setMessage(null);
        startTransition(async () => {
            try {
                const result = await requestJson<{ message?: string }>("/api/admin/alumni/promote-bulk", {
                    method: "POST",
                });
                setMessage({ type: "success", text: result.message ?? "Bulk promotion complete." });
                refresh();
            } catch (error) {
                setMessage({ type: "error", text: error instanceof Error ? error.message : "Bulk promotion failed." });
            }
        });
    }

    function saveAssociation(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedInstitutionId) {
            setMessage({ type: "error", text: "Select an institution first." });
            return;
        }
        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson("/api/admin/alumni/association", {
                    method: "PUT",
                    body: JSON.stringify({ institutionId: selectedInstitutionId, ...associationForm }),
                });
                setMessage({ type: "success", text: "Alumni association saved." });
                refresh();
            } catch (error) {
                setMessage({ type: "error", text: error instanceof Error ? error.message : "Save failed." });
            }
        });
    }

    function addContribution(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson("/api/admin/alumni/contributions", {
                    method: "POST",
                    body: JSON.stringify({
                        ...contributionForm,
                        alumniId: contributionForm.alumniId || undefined,
                        amount: contributionForm.amount || undefined,
                    }),
                });
                setMessage({ type: "success", text: "Contribution recorded." });
                setContributionForm((current) => ({ ...current, alumniName: "", amount: "", purposeDescription: "" }));
                refresh();
            } catch (error) {
                setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to record contribution." });
            }
        });
    }

    function removeContribution(id: string) {
        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson(`/api/admin/alumni/contributions/${id}`, { method: "DELETE" });
                refresh();
            } catch (error) {
                setMessage({ type: "error", text: error instanceof Error ? error.message : "Delete failed." });
            }
        });
    }

    if (!console_) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading...</CardContent>
            </Card>
        );
    }

    const associationOptions = (console_.associations ?? []) as AnyRecord[];
    const currentAssociation = associationOptions.find(
        (item) => item.institutionId?.toString() === selectedInstitutionId
    );

    return (
        <div className="space-y-6">
            {message ? <FormMessage type={message.type} message={message.text} /> : null}

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle>Graduated students pending alumni promotion</CardTitle>
                            <CardDescription>Promote a graduated student to create their alumni login.</CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            loading={isPending}
                            disabled={isPending || !console_.graduatedStudentsPendingPromotion?.length}
                            onClick={promoteAllGraduated}
                        >
                            Promote all graduated students
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {console_.graduatedStudentsPendingPromotion?.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Enrollment No.</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {console_.graduatedStudentsPendingPromotion.map((student: AnyRecord) => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{student.enrollmentNo}</TableCell>
                                        <TableCell>{student.email ?? "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                loading={isPending}
                                                disabled={isPending || !student.email}
                                                onClick={() => promoteStudent(student.id)}
                                            >
                                                Promote
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground">No graduated students awaiting promotion.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Alumni directory</CardTitle>
                    <CardDescription>{console_.alumniList?.length ?? 0} alumni provisioned.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Enrollment No.</TableHead>
                                <TableHead>Graduation Year</TableHead>
                                <TableHead>Current Employer</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(console_.alumniList ?? []).map((alumni: AnyRecord) => (
                                <TableRow key={alumni.id}>
                                    <TableCell>{alumni.name}</TableCell>
                                    <TableCell>{alumni.enrollmentNo}</TableCell>
                                    <TableCell>{alumni.graduationYear}</TableCell>
                                    <TableCell>{alumni.currentEmployer ?? "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{alumni.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Alumni Association (NAAC 5.4.1)</CardTitle>
                    <CardDescription>Registration and functional status per institution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2 md:max-w-sm">
                        <Label>Institution</Label>
                        <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                            <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                            <SelectContent>
                                {(console_.institutionOptions ?? []).map((option: AnyRecord) => (
                                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedInstitutionId ? (
                        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveAssociation}>
                            <div className="grid gap-2 md:col-span-2">
                                <Label>Association name</Label>
                                <Input
                                    value={associationForm.name}
                                    onChange={(event) => setAssociationForm((current) => ({ ...current, name: event.target.value }))}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={associationForm.isRegistered}
                                    onCheckedChange={(checked) => setAssociationForm((current) => ({ ...current, isRegistered: Boolean(checked) }))}
                                />
                                <Label>Registered</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={associationForm.isFunctional}
                                    onCheckedChange={(checked) => setAssociationForm((current) => ({ ...current, isFunctional: Boolean(checked) }))}
                                />
                                <Label>Functional</Label>
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    rows={3}
                                    value={associationForm.description}
                                    onChange={(event) => setAssociationForm((current) => ({ ...current, description: event.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button type="submit" loading={isPending} disabled={isPending}>
                                    {currentAssociation ? "Update association" : "Create association"}
                                </Button>
                            </div>
                        </form>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Alumni Contributions (NAAC 5.4.2)</CardTitle>
                    <CardDescription>Financial and non-financial contributions during the last five years.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form className="grid gap-4 md:grid-cols-3" onSubmit={addContribution}>
                        <div className="grid gap-2">
                            <Label>Association</Label>
                            <Select
                                value={contributionForm.associationId}
                                onValueChange={(value) => setContributionForm((current) => ({ ...current, associationId: value }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select association" /></SelectTrigger>
                                <SelectContent>
                                    {associationOptions.map((option) => (
                                        <SelectItem key={option._id} value={option._id}>{option.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Alumni name</Label>
                            <Input
                                value={contributionForm.alumniName}
                                onChange={(event) => setContributionForm((current) => ({ ...current, alumniName: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Alumni ID (optional link)</Label>
                            <Input
                                placeholder="Paste the alumni record id"
                                value={contributionForm.alumniId}
                                onChange={(event) => setContributionForm((current) => ({ ...current, alumniId: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select
                                value={contributionForm.contributionType}
                                onValueChange={(value) => setContributionForm((current) => ({ ...current, contributionType: value }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Financial">Financial</SelectItem>
                                    <SelectItem value="NonFinancial">Non-financial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Band (5-year total)</Label>
                            <Select
                                value={contributionForm.contributionBand}
                                onValueChange={(value) => setContributionForm((current) => ({ ...current, contributionBand: value }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CONTRIBUTION_BAND_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Year</Label>
                            <Input
                                type="number"
                                value={contributionForm.contributionYear}
                                onChange={(event) => setContributionForm((current) => ({ ...current, contributionYear: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Amount (optional, exact figure)</Label>
                            <Input
                                type="number"
                                value={contributionForm.amount}
                                onChange={(event) => setContributionForm((current) => ({ ...current, amount: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Purpose</Label>
                            <Input
                                value={contributionForm.purposeDescription}
                                onChange={(event) => setContributionForm((current) => ({ ...current, purposeDescription: event.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Button type="submit" loading={isPending} disabled={isPending || !contributionForm.associationId}>
                                Record contribution
                            </Button>
                        </div>
                    </form>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Year</TableHead>
                                <TableHead>Alumni</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Band</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead className="w-[80px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(console_.contributions ?? []).map((contribution: AnyRecord) => (
                                <TableRow key={contribution._id}>
                                    <TableCell>{contribution.contributionYear}</TableCell>
                                    <TableCell>{contribution.alumniName}</TableCell>
                                    <TableCell>{contribution.contributionType}</TableCell>
                                    <TableCell>{CONTRIBUTION_BAND_LABELS[contribution.contributionBand] ?? contribution.contributionBand}</TableCell>
                                    <TableCell>{contribution.purposeDescription ?? "-"}</TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => removeContribution(contribution._id)}
                                        >
                                            Remove
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
