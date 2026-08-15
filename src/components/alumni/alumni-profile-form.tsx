"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AlumniProfile = {
    firstName: string;
    lastName?: string;
    enrollmentNo: string;
    email?: string;
    mobile?: string;
    graduationYear: number;
    currentEmployer?: string;
    currentDesignation?: string;
};

export function AlumniProfileForm({ alumni }: { alumni: AlumniProfile }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [mobile, setMobile] = useState(alumni.mobile ?? "");
    const [currentEmployer, setCurrentEmployer] = useState(alumni.currentEmployer ?? "");
    const [currentDesignation, setCurrentDesignation] = useState(alumni.currentDesignation ?? "");

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            const res = await fetch("/api/alumni/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mobile, currentEmployer, currentDesignation }),
            });
            const result = (await res.json()) as { message?: string };
            if (!res.ok) {
                setMessage({ type: "error", text: result.message ?? "Unable to update profile." });
                return;
            }
            setMessage({ type: "success", text: result.message ?? "Profile updated." });
            router.refresh();
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                    Identity and academic mapping are locked; contact and career details can be kept current below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {message ? <FormMessage type={message.type} message={message.text} /> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label>Name</Label>
                        <p className="text-sm font-medium text-foreground">
                            {[alumni.firstName, alumni.lastName].filter(Boolean).join(" ")}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <Label>Enrollment No.</Label>
                        <p className="text-sm font-medium text-foreground">{alumni.enrollmentNo}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Email</Label>
                        <p className="text-sm font-medium text-foreground">{alumni.email ?? "-"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Graduation Year</Label>
                        <p className="text-sm font-medium text-foreground">{alumni.graduationYear}</p>
                    </div>
                </div>

                <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="alumni-mobile">Mobile</Label>
                        <Input id="alumni-mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="alumni-employer">Current Employer</Label>
                        <Input
                            id="alumni-employer"
                            value={currentEmployer}
                            onChange={(event) => setCurrentEmployer(event.target.value)}
                        />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="alumni-designation">Current Designation</Label>
                        <Input
                            id="alumni-designation"
                            value={currentDesignation}
                            onChange={(event) => setCurrentDesignation(event.target.value)}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Button loading={isPending} disabled={isPending} type="submit">
                            Save changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
