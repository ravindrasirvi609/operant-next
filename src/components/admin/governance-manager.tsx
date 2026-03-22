"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type OrganizationOption = {
    _id: string;
    name: string;
    type: string;
    universityName?: string;
    collegeName?: string;
};

type UserOption = {
    _id: string;
    name: string;
    email: string;
    role: string;
    designation?: string;
};

type LeadershipAssignment = {
    _id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    userRole?: string;
    userDesignation?: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
    assignmentType: string;
    title?: string;
    universityName?: string;
    collegeName?: string;
    startDate?: string;
    endDate?: string;
    isPrimary: boolean;
    isActive: boolean;
    notes?: string;
};

type GovernanceCommittee = {
    _id: string;
    name: string;
    code?: string;
    committeeType: string;
    scopeType: string;
    organizationId?: string;
    organizationName?: string;
    organizationType?: string;
    academicYearLabel?: string;
    description?: string;
    isActive: boolean;
};

type GovernanceCommitteeMembership = {
    _id: string;
    committeeId: string;
    committeeName: string;
    committeeType?: string;
    userId?: string;
    userName: string;
    userEmail?: string;
    userRole?: string;
    userDesignation?: string;
    memberName?: string;
    memberEmail?: string;
    memberRole: string;
    isExternal: boolean;
    isActive: boolean;
};

const assignmentTypeOptions = [
    "HOD",
    "PRINCIPAL",
    "IQAC_COORDINATOR",
    "DIRECTOR",
    "OFFICE_HEAD",
] as const;

const committeeTypeOptions = [
    "IQAC",
    "PBAS_REVIEW",
    "CAS_SCREENING",
    "AQAR_REVIEW",
    "BOARD_OF_STUDIES",
    "NAAC_CELL",
    "RESEARCH_COMMITTEE",
    "ANTI_RAGGING",
    "OTHER",
] as const;

const committeeScopeOptions = [
    "InstitutionWide",
    "University",
    "College",
    "Department",
    "Center",
    "Office",
] as const;

const memberRoleOptions = [
    "Chair",
    "Secretary",
    "Convenor",
    "Member",
    "ExternalExpert",
] as const;

const emptySelectValue = "__none__";

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as { message?: string } & T;

    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

export function GovernanceManager({
    assignments: initialAssignments,
    committees: initialCommittees,
    memberships: initialMemberships,
    organizations,
    users,
}: {
    assignments: LeadershipAssignment[];
    committees: GovernanceCommittee[];
    memberships: GovernanceCommitteeMembership[];
    organizations: OrganizationOption[];
    users: UserOption[];
}) {
    const [assignments, setAssignments] = useState(initialAssignments);
    const [committees, setCommittees] = useState(initialCommittees);
    const [memberships, setMemberships] = useState(initialMemberships);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const [assignmentForm, setAssignmentForm] = useState({
        userId: "",
        organizationId: "",
        assignmentType: "HOD",
        title: "",
        startDate: "",
        endDate: "",
        isPrimary: false,
        notes: "",
    });

    const [committeeForm, setCommitteeForm] = useState({
        name: "",
        code: "",
        committeeType: "IQAC",
        scopeType: "InstitutionWide",
        organizationId: "",
        academicYearLabel: "",
        description: "",
    });

    const [membershipForm, setMembershipForm] = useState({
        committeeId: "",
        userId: "",
        memberRole: "Member",
    });

    const sortedUsers = useMemo(
        () => [...users].sort((left, right) => left.name.localeCompare(right.name)),
        [users]
    );

    const sortedOrganizations = useMemo(
        () =>
            [...organizations].sort(
                (left, right) =>
                    left.type.localeCompare(right.type) || left.name.localeCompare(right.name)
            ),
        [organizations]
    );

    const membershipsByCommittee = useMemo(() => {
        const grouped = new Map<string, GovernanceCommitteeMembership[]>();

        for (const membership of memberships) {
            const current = grouped.get(membership.committeeId) ?? [];
            current.push(membership);
            grouped.set(membership.committeeId, current);
        }

        return grouped;
    }, [memberships]);

    function setSuccess(text: string) {
        setMessage({ type: "success", text });
    }

    function setError(error: unknown, fallback: string) {
        setMessage({
            type: "error",
            text: error instanceof Error ? error.message : fallback,
        });
    }

    function submitAssignment() {
        setMessage(null);

        startTransition(async () => {
            try {
                const assignment = await requestJson<LeadershipAssignment>(
                    "/api/admin/governance/leadership-assignments",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            ...assignmentForm,
                            isActive: true,
                        }),
                    }
                );

                setAssignments((current) => [assignment, ...current]);
                setAssignmentForm({
                    userId: "",
                    organizationId: "",
                    assignmentType: "HOD",
                    title: "",
                    startDate: "",
                    endDate: "",
                    isPrimary: false,
                    notes: "",
                });
                setSuccess("Leadership assignment created.");
            } catch (error) {
                setError(error, "Unable to create leadership assignment.");
            }
        });
    }

    function toggleAssignment(assignment: LeadershipAssignment) {
        startTransition(async () => {
            try {
                const updated = await requestJson<LeadershipAssignment>(
                    `/api/admin/governance/leadership-assignments/${assignment._id}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            isActive: !assignment.isActive,
                        }),
                    }
                );

                setAssignments((current) =>
                    current.map((item) => (item._id === updated._id ? updated : item))
                );
                setSuccess("Leadership assignment updated.");
            } catch (error) {
                setError(error, "Unable to update leadership assignment.");
            }
        });
    }

    function submitCommittee() {
        setMessage(null);

        startTransition(async () => {
            try {
                const committee = await requestJson<GovernanceCommittee>(
                    "/api/admin/governance/committees",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            ...committeeForm,
                            organizationId:
                                committeeForm.organizationId === emptySelectValue
                                    ? ""
                                    : committeeForm.organizationId,
                            isActive: true,
                        }),
                    }
                );

                setCommittees((current) => [committee, ...current]);
                setCommitteeForm({
                    name: "",
                    code: "",
                    committeeType: "IQAC",
                    scopeType: "InstitutionWide",
                    organizationId: "",
                    academicYearLabel: "",
                    description: "",
                });
                setSuccess("Committee created.");
            } catch (error) {
                setError(error, "Unable to create committee.");
            }
        });
    }

    function toggleCommittee(committee: GovernanceCommittee) {
        startTransition(async () => {
            try {
                const updated = await requestJson<GovernanceCommittee>(
                    `/api/admin/governance/committees/${committee._id}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            isActive: !committee.isActive,
                        }),
                    }
                );

                setCommittees((current) =>
                    current.map((item) => (item._id === updated._id ? updated : item))
                );
                setSuccess("Committee updated.");
            } catch (error) {
                setError(error, "Unable to update committee.");
            }
        });
    }

    function submitMembership() {
        setMessage(null);

        startTransition(async () => {
            try {
                const membership = await requestJson<GovernanceCommitteeMembership>(
                    "/api/admin/governance/committee-memberships",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            committeeId: membershipForm.committeeId,
                            userId: membershipForm.userId,
                            memberRole: membershipForm.memberRole,
                            isExternal: false,
                            isActive: true,
                        }),
                    }
                );

                setMemberships((current) => [membership, ...current]);
                setMembershipForm({
                    committeeId: "",
                    userId: "",
                    memberRole: "Member",
                });
                setSuccess("Committee member added.");
            } catch (error) {
                setError(error, "Unable to add committee member.");
            }
        });
    }

    function toggleMembership(membership: GovernanceCommitteeMembership) {
        startTransition(async () => {
            try {
                const updated = await requestJson<GovernanceCommitteeMembership>(
                    `/api/admin/governance/committee-memberships/${membership._id}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            isActive: !membership.isActive,
                        }),
                    }
                );

                setMemberships((current) =>
                    current.map((item) => (item._id === updated._id ? updated : item))
                );
                setSuccess("Committee membership updated.");
            } catch (error) {
                setError(error, "Unable to update committee membership.");
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <Tabs defaultValue="assignments">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="assignments">Leadership Assignments</TabsTrigger>
                    <TabsTrigger value="committees">Committees</TabsTrigger>
                </TabsList>

                <TabsContent value="assignments" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create leadership assignment</CardTitle>
                            <CardDescription>
                                Map a faculty or admin account to HOD, Principal, IQAC, or other official leadership responsibility.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <Field label="User">
                                <Select
                                    value={assignmentForm.userId || undefined}
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({ ...current, userId: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedUsers.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                                {user.name} ({user.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Assignment type">
                                    <Select
                                        value={assignmentForm.assignmentType}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({ ...current, assignmentType: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assignmentTypeOptions.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Organization">
                                    <Select
                                        value={assignmentForm.organizationId || undefined}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({ ...current, organizationId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sortedOrganizations.map((organization) => (
                                                <SelectItem key={organization._id} value={organization._id}>
                                                    {organization.name} ({organization.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Display title">
                                    <Input
                                        value={assignmentForm.title}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                        placeholder="Head of Department / Principal"
                                    />
                                </Field>
                                <Field label="Notes">
                                    <Input
                                        value={assignmentForm.notes}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({ ...current, notes: event.target.value }))
                                        }
                                        placeholder="Optional notes"
                                    />
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Start date">
                                    <Input
                                        type="date"
                                        value={assignmentForm.startDate}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({ ...current, startDate: event.target.value }))
                                        }
                                    />
                                </Field>
                                <Field label="End date">
                                    <Input
                                        type="date"
                                        value={assignmentForm.endDate}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({ ...current, endDate: event.target.value }))
                                        }
                                    />
                                </Field>
                            </div>

                            <label className="flex items-center gap-3 text-sm text-zinc-600">
                                <input
                                    checked={assignmentForm.isPrimary}
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            isPrimary: event.target.checked,
                                        }))
                                    }
                                    type="checkbox"
                                />
                                Mark as primary assignment for this role and organization
                            </label>

                            <div className="flex justify-end">
                                <Button disabled={isPending} type="button" onClick={submitAssignment}>
                                    {isPending ? <Spinner /> : null}
                                    Save Assignment
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active and historical assignments</CardTitle>
                            <CardDescription>
                                Deactivate assignments to preserve history without deleting workflow references.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {assignments.length ? (
                                assignments.map((assignment) => (
                                    <div
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                        key={assignment._id}
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-semibold text-zinc-950">
                                                        {assignment.userName}
                                                    </h3>
                                                    <Badge variant="secondary">{assignment.assignmentType}</Badge>
                                                    <Badge>{assignment.isActive ? "Active" : "Inactive"}</Badge>
                                                    {assignment.isPrimary ? <Badge>Primary</Badge> : null}
                                                </div>
                                                <p className="text-sm text-zinc-600">
                                                    {assignment.organizationName} ({assignment.organizationType})
                                                </p>
                                                <p className="text-sm text-zinc-500">
                                                    {assignment.userEmail || "-"}{assignment.userDesignation ? ` • ${assignment.userDesignation}` : ""}
                                                </p>
                                                {assignment.title ? (
                                                    <p className="text-sm text-zinc-500">Title: {assignment.title}</p>
                                                ) : null}
                                            </div>
                                            <Button
                                                disabled={isPending}
                                                onClick={() => toggleAssignment(assignment)}
                                                type="button"
                                                variant="secondary"
                                            >
                                                {assignment.isActive ? "Deactivate" : "Activate"}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState text="No governance assignments have been created yet." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="committees" className="mt-6 space-y-6">
                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create committee</CardTitle>
                                <CardDescription>
                                    Define a reusable committee that can be linked into governance and workflow stages.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <Field label="Committee name">
                                    <Input
                                        value={committeeForm.name}
                                        onChange={(event) =>
                                            setCommitteeForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="IQAC Core Committee"
                                    />
                                </Field>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Committee type">
                                        <Select
                                            value={committeeForm.committeeType}
                                            onValueChange={(value) =>
                                                setCommitteeForm((current) => ({ ...current, committeeType: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {committeeTypeOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="Scope">
                                        <Select
                                            value={committeeForm.scopeType}
                                            onValueChange={(value) =>
                                                setCommitteeForm((current) => ({ ...current, scopeType: value }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {committeeScopeOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Organization">
                                        <Select
                                            value={committeeForm.organizationId || emptySelectValue}
                                            onValueChange={(value) =>
                                                setCommitteeForm((current) => ({
                                                    ...current,
                                                    organizationId: value === emptySelectValue ? "" : value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="No organization" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={emptySelectValue}>No organization</SelectItem>
                                                {sortedOrganizations.map((organization) => (
                                                    <SelectItem key={organization._id} value={organization._id}>
                                                        {organization.name} ({organization.type})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Academic year">
                                        <Input
                                            value={committeeForm.academicYearLabel}
                                            onChange={(event) =>
                                                setCommitteeForm((current) => ({
                                                    ...current,
                                                    academicYearLabel: event.target.value,
                                                }))
                                            }
                                            placeholder="2026-2027"
                                        />
                                    </Field>
                                </div>

                                <Field label="Description">
                                    <Textarea
                                        value={committeeForm.description}
                                        onChange={(event) =>
                                            setCommitteeForm((current) => ({
                                                ...current,
                                                description: event.target.value,
                                            }))
                                        }
                                        placeholder="Purpose, mandate, or workflow usage"
                                    />
                                </Field>

                                <div className="flex justify-end">
                                    <Button disabled={isPending} type="button" onClick={submitCommittee}>
                                        {isPending ? <Spinner /> : null}
                                        Save Committee
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Add committee member</CardTitle>
                                <CardDescription>
                                    Link internal users to committees so workflow routing and notifications can resolve actual approvers.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <Field label="Committee">
                                    <Select
                                        value={membershipForm.committeeId || undefined}
                                        onValueChange={(value) =>
                                            setMembershipForm((current) => ({ ...current, committeeId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select committee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {committees
                                                .filter((committee) => committee.isActive)
                                                .map((committee) => (
                                                    <SelectItem key={committee._id} value={committee._id}>
                                                        {committee.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="User">
                                    <Select
                                        value={membershipForm.userId || undefined}
                                        onValueChange={(value) =>
                                            setMembershipForm((current) => ({ ...current, userId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sortedUsers.map((user) => (
                                                <SelectItem key={user._id} value={user._id}>
                                                    {user.name} ({user.role})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Member role">
                                    <Select
                                        value={membershipForm.memberRole}
                                        onValueChange={(value) =>
                                            setMembershipForm((current) => ({ ...current, memberRole: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {memberRoleOptions.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <div className="flex justify-end">
                                    <Button disabled={isPending} type="button" onClick={submitMembership}>
                                        {isPending ? <Spinner /> : null}
                                        Add Member
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Committee registry</CardTitle>
                            <CardDescription>
                                Each committee keeps its own active member list and can be deactivated without losing historical memberships.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {committees.length ? (
                                committees.map((committee) => (
                                    <div
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                        key={committee._id}
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-semibold text-zinc-950">
                                                        {committee.name}
                                                    </h3>
                                                    <Badge variant="secondary">{committee.committeeType}</Badge>
                                                    <Badge>{committee.isActive ? "Active" : "Inactive"}</Badge>
                                                </div>
                                                <p className="text-sm text-zinc-600">
                                                    Scope: {committee.scopeType}
                                                    {committee.organizationName
                                                        ? ` • ${committee.organizationName}`
                                                        : ""}
                                                </p>
                                                {committee.description ? (
                                                    <p className="text-sm text-zinc-500">
                                                        {committee.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <Button
                                                disabled={isPending}
                                                onClick={() => toggleCommittee(committee)}
                                                type="button"
                                                variant="secondary"
                                            >
                                                {committee.isActive ? "Deactivate" : "Activate"}
                                            </Button>
                                        </div>

                                        <div className="mt-4 grid gap-2">
                                            {(membershipsByCommittee.get(committee._id) ?? []).length ? (
                                                (membershipsByCommittee.get(committee._id) ?? []).map((membership) => (
                                                    <div
                                                        className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                                                        key={membership._id}
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-900">
                                                                {membership.userName}
                                                            </p>
                                                            <p className="text-sm text-zinc-500">
                                                                {membership.memberRole}
                                                                {membership.userDesignation
                                                                    ? ` • ${membership.userDesignation}`
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            disabled={isPending}
                                                            onClick={() => toggleMembership(membership)}
                                                            size="sm"
                                                            type="button"
                                                            variant="secondary"
                                                        >
                                                            {membership.isActive ? "Deactivate" : "Activate"}
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500">
                                                    No members assigned yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState text="No committees have been created yet." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            {text}
        </div>
    );
}
