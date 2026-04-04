"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SurveyQuestion = {
    _id: string;
    questionText: string;
    ratingScaleMax: number;
    analyticsBucket: string;
};

type SurveyRecord = {
    _id: string;
    surveyTitle: string;
    surveyStatus: string;
    startDate?: string;
    endDate?: string;
    eligibility?: {
        isResponseSubmitted: boolean;
    } | null;
    analytics?: {
        overallSatisfactionIndex?: number;
        responseRate?: number;
    } | null;
    questions: SurveyQuestion[];
};

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

export function StudentSssWorkspace({
    studentName,
    surveys,
}: {
    studentName: string;
    surveys: SurveyRecord[];
}) {
    const router = useRouter();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [activeSurveyId, setActiveSurveyId] = useState(surveys.find((survey) => !survey.eligibility?.isResponseSubmitted)?._id ?? surveys[0]?._id ?? "");
    const [answers, setAnswers] = useState<Record<string, { ratingValue: string; remarks: string }>>({});

    const activeSurvey = useMemo(
        () => surveys.find((survey) => survey._id === activeSurveyId) ?? null,
        [surveys, activeSurveyId]
    );

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeSurvey) {
            return;
        }

        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson(`/api/student/sss/surveys/${activeSurvey._id}/submit`, {
                    method: "POST",
                    body: JSON.stringify({
                        answers: activeSurvey.questions.map((question) => ({
                            questionId: question._id,
                            ratingValue: Number(answers[question._id]?.ratingValue ?? 0),
                            remarks: answers[question._id]?.remarks || undefined,
                        })),
                    }),
                });
                setMessage({ type: "success", text: "Your SSS response was submitted successfully." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to submit the survey.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Student Satisfaction Survey</CardTitle>
                    <CardDescription>
                        Submit your anonymous survey responses for the active institutional SSS cycle. Eligibility is checked using your student account, but your stored response is anonymous.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Badge>{studentName}</Badge>
                        {surveys.map((survey) => (
                            <Button
                                key={survey._id}
                                type="button"
                                variant={survey._id === activeSurveyId ? "default" : "outline"}
                                onClick={() => setActiveSurveyId(survey._id)}
                            >
                                {survey.surveyTitle}
                            </Button>
                        ))}
                    </div>
                    {message ? <FormMessage type={message.type} message={message.text} /> : null}
                </CardContent>
            </Card>

            {!activeSurvey ? (
                <Card>
                    <CardContent className="p-6 text-sm text-zinc-500">
                        No Student Satisfaction Survey is currently assigned to your account.
                    </CardContent>
                </Card>
            ) : activeSurvey.eligibility?.isResponseSubmitted ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{activeSurvey.surveyTitle}</CardTitle>
                        <CardDescription>
                            You already completed this survey. The live analytics snapshot is shown below for transparency.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-zinc-600">
                        <p>Overall satisfaction index: {activeSurvey.analytics?.overallSatisfactionIndex ?? 0}%</p>
                        <p>Institutional response rate: {activeSurvey.analytics?.responseRate ?? 0}%</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{activeSurvey.surveyTitle}</CardTitle>
                        <CardDescription>
                            Rate each statement on the configured scale and optionally leave short remarks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {activeSurvey.questions.map((question) => (
                                <div key={question._id} className="rounded-xl border border-zinc-200 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">{question.analyticsBucket}</Badge>
                                        <Badge variant="outline">Scale 1-{question.ratingScaleMax}</Badge>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-zinc-900">{question.questionText}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {Array.from({ length: question.ratingScaleMax }, (_, index) => index + 1).map((rating) => (
                                            <Button
                                                key={rating}
                                                type="button"
                                                variant={answers[question._id]?.ratingValue === String(rating) ? "default" : "outline"}
                                                onClick={() =>
                                                    setAnswers((current) => ({
                                                        ...current,
                                                        [question._id]: {
                                                            ratingValue: String(rating),
                                                            remarks: current[question._id]?.remarks ?? "",
                                                        },
                                                    }))
                                                }
                                            >
                                                {rating}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="mt-4 grid gap-2">
                                        <Label htmlFor={`remarks-${question._id}`}>Remarks</Label>
                                        <Textarea
                                            id={`remarks-${question._id}`}
                                            rows={3}
                                            value={answers[question._id]?.remarks ?? ""}
                                            onChange={(event) =>
                                                setAnswers((current) => ({
                                                    ...current,
                                                    [question._id]: {
                                                        ratingValue: current[question._id]?.ratingValue ?? "",
                                                        remarks: event.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            ))}

                            <Button disabled={isPending} type="submit">
                                {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                Submit SSS response
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
