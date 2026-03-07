"use client";

import { useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type StudentRecord = {
    _id: string;
    name: string;
    email: string;
    department?: string;
    collegeName?: string;
    studentDetails?: {
        rollNo?: string;
        course?: string;
        batch?: string;
        profileStatus?: string;
        profileSubmittedAt?: string;
        rejectionReason?: string;
        academicInfo?: {
            currentSemester?: string;
            cgpa?: string;
        };
        careerProfile?: {
            headline?: string;
            summary?: string;
            skills?: string[];
        };
    };
};

export function DirectorApprovalQueue({ students }: { students: StudentRecord[] }) {
    const [items, setItems] = useState(students);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );

    function handleDecision(studentId: string, decision: "approve" | "reject") {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch(`/api/director/student-approvals/${studentId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    decision,
                    notes: notes[studentId] ?? "",
                }),
            });

            const data = (await response.json()) as { message?: string; studentDetails?: { profileStatus?: string } };

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: data.message ?? "Unable to process approval.",
                });
                return;
            }

            setItems((current) =>
                current.map((item) =>
                    item._id === studentId
                        ? {
                              ...item,
                              studentDetails: {
                                  ...item.studentDetails,
                                  profileStatus: data.studentDetails?.profileStatus,
                              },
                          }
                        : item
                )
            );
            setMessage({
                type: "success",
                text: data.message ?? "Decision recorded.",
            });
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                    <CardHeader>
                        <CardTitle>Student approval queue</CardTitle>
                        <CardDescription>
                        These submissions are routed only from departments under the colleges where you are assigned as the HOD.
                        </CardDescription>
                    </CardHeader>
            </Card>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            {items.length ? (
                items.map((student) => (
                    <Card key={student._id}>
                        <CardHeader>
                            <CardTitle>{student.name}</CardTitle>
                            <CardDescription>
                                {student.email} • {student.department} • {student.studentDetails?.rollNo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <InfoItem label="Course" value={student.studentDetails?.course ?? "-"} />
                                <InfoItem label="Batch" value={student.studentDetails?.batch ?? "-"} />
                                <InfoItem label="CGPA" value={student.studentDetails?.academicInfo?.cgpa ?? "-"} />
                            </div>
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Profile Summary</p>
                                <p className="mt-2 text-sm text-zinc-600">{student.studentDetails?.careerProfile?.summary ?? "No summary submitted."}</p>
                                <p className="mt-3 text-sm text-zinc-600">
                                    Skills: {(student.studentDetails?.careerProfile?.skills ?? []).join(", ") || "Not provided"}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-zinc-950">HOD Notes</label>
                                <Textarea
                                    onChange={(event) =>
                                        setNotes((current) => ({
                                            ...current,
                                            [student._id]: event.target.value,
                                        }))
                                    }
                                    placeholder="Add approval notes or revision points"
                                    value={notes[student._id] ?? ""}
                                />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isPending} onClick={() => handleDecision(student._id, "approve")}>
                                    {isPending ? <Spinner /> : null}
                                    Approve And Activate Login
                                </Button>
                                <Button disabled={isPending} onClick={() => handleDecision(student._id, "reject")} variant="secondary">
                                    Send Back For Revision
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardContent className="p-6 text-sm text-zinc-500">
                        No student approvals are currently pending for your departments.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
