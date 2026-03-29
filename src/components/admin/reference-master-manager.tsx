"use client";

import { useMemo, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const AWARD_CATEGORY_OPTIONS_ID = "award-category-options";
const AWARD_ORGANIZING_BODY_OPTIONS_ID = "award-organizing-body-options";

function uniqueSortedValues(values: Array<string | undefined>) {
    const seen = new Set<string>();
    const unique: string[] = [];

    values.forEach((value) => {
        const normalized = value?.trim();
        if (!normalized) {
            return;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        unique.push(normalized);
    });

    return unique.sort((left, right) => left.localeCompare(right));
}

type AwardRecord = {
    _id: string;
    title: string;
    category?: string;
    organizingBody?: string;
    level?: string;
    isActive?: boolean;
};

type SkillRecord = {
    _id: string;
    name: string;
    category: string;
    isActive?: boolean;
};

type SportRecord = {
    _id: string;
    sportName: string;
    isActive?: boolean;
};

type CulturalActivityRecord = {
    _id: string;
    name: string;
    category?: string;
    isActive?: boolean;
};

type SocialProgramRecord = {
    _id: string;
    name: string;
    type: string;
    description?: string;
    isActive?: boolean;
};

type EventRecord = {
    _id: string;
    title: string;
    eventType: string;
    organizedBy: string;
    level?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
};

type ReferenceMasterPayload = {
    awards: AwardRecord[];
    skills: SkillRecord[];
    sports: SportRecord[];
    culturalActivities: CulturalActivityRecord[];
    socialPrograms: SocialProgramRecord[];
    events: EventRecord[];
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

function StatusBadge({ active }: { active?: boolean }) {
    return (
        <Badge
            className={
                active === false
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
        >
            {active === false ? "Inactive" : "Active"}
        </Badge>
    );
}

export function ReferenceMasterManager({ initialData }: { initialData: ReferenceMasterPayload }) {
    const [data, setData] = useState(initialData);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const [awardForm, setAwardForm] = useState({ title: "", category: "", organizingBody: "", level: "College" });
    const [skillForm, setSkillForm] = useState({ name: "", category: "Technical" });
    const [sportForm, setSportForm] = useState({ sportName: "" });
    const [culturalForm, setCulturalForm] = useState({ name: "", category: "" });
    const [socialForm, setSocialForm] = useState({ name: "", type: "Social", description: "" });
    const [eventForm, setEventForm] = useState({
        title: "",
        eventType: "Other",
        organizedBy: "",
        level: "College",
        location: "",
        startDate: "",
        endDate: "",
    });

    const counts = useMemo(
        () => ({
            awards: data.awards.filter((item) => item.isActive !== false).length,
            skills: data.skills.filter((item) => item.isActive !== false).length,
            sports: data.sports.filter((item) => item.isActive !== false).length,
            culturalActivities: data.culturalActivities.filter((item) => item.isActive !== false).length,
            socialPrograms: data.socialPrograms.filter((item) => item.isActive !== false).length,
            events: data.events.filter((item) => item.isActive !== false).length,
        }),
        [data]
    );

    const awardCategoryOptions = useMemo(
        () => uniqueSortedValues(data.awards.map((item) => item.category)),
        [data.awards]
    );

    const awardOrganizingBodyOptions = useMemo(
        () => uniqueSortedValues(data.awards.map((item) => item.organizingBody)),
        [data.awards]
    );

    function refresh() {
        startTransition(async () => {
            try {
                const next = await requestJson<ReferenceMasterPayload>("/api/admin/reference-masters");
                setData(next);
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to refresh reference masters.",
                });
            }
        });
    }

    function create(kind: string, payload: Record<string, unknown>, reset: () => void) {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson("/api/admin/reference-masters", {
                    method: "POST",
                    body: JSON.stringify({ kind, ...payload }),
                });
                reset();
                setMessage({ type: "success", text: `${kind} master created.` });
                refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to create reference master.",
                });
            }
        });
    }

    function toggle(kind: string, id: string, nextIsActive: boolean) {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(`/api/admin/reference-masters/${kind}/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ isActive: nextIsActive }),
                });
                setMessage({
                    type: "success",
                    text: `${kind} master ${nextIsActive ? "activated" : "deactivated"}.`,
                });
                refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to update reference master.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <SummaryCard label="Awards" value={counts.awards} />
                <SummaryCard label="Skills" value={counts.skills} />
                <SummaryCard label="Sports" value={counts.sports} />
                <SummaryCard label="Cultural" value={counts.culturalActivities} />
                <SummaryCard label="Social" value={counts.socialPrograms} />
                <SummaryCard label="Events" value={counts.events} />
            </div>

            <Tabs defaultValue="award" className="space-y-4">
                <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
                    <TabsTrigger value="award">Awards</TabsTrigger>
                    <TabsTrigger value="skill">Skills</TabsTrigger>
                    <TabsTrigger value="sport">Sports</TabsTrigger>
                    <TabsTrigger value="cultural-activity">Cultural</TabsTrigger>
                    <TabsTrigger value="social-program">Social</TabsTrigger>
                    <TabsTrigger value="event">Events</TabsTrigger>
                </TabsList>

                <TabsContent value="award">
                    <ReferenceSection
                        description="Govern the award master list used in student activity records."
                        title="Awards"
                    >
                        <div className="grid gap-4 md:grid-cols-4">
                            <Field label="Title"><Input value={awardForm.title} onChange={(event) => setAwardForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                            <Field label="Category">
                                <Input
                                    list={AWARD_CATEGORY_OPTIONS_ID}
                                    placeholder="Select or type category"
                                    value={awardForm.category}
                                    onChange={(event) => setAwardForm((current) => ({ ...current, category: event.target.value }))}
                                />
                            </Field>
                            <Field label="Organizing body">
                                <Input
                                    list={AWARD_ORGANIZING_BODY_OPTIONS_ID}
                                    placeholder="Select or type organizing body"
                                    value={awardForm.organizingBody}
                                    onChange={(event) => setAwardForm((current) => ({ ...current, organizingBody: event.target.value }))}
                                />
                            </Field>
                            <Field label="Level">
                                <Select value={awardForm.level} onValueChange={(value) => setAwardForm((current) => ({ ...current, level: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["College", "State", "National", "International"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <datalist id={AWARD_CATEGORY_OPTIONS_ID}>
                            {awardCategoryOptions.map((option) => (
                                <option key={option} value={option} />
                            ))}
                        </datalist>
                        <datalist id={AWARD_ORGANIZING_BODY_OPTIONS_ID}>
                            {awardOrganizingBodyOptions.map((option) => (
                                <option key={option} value={option} />
                            ))}
                        </datalist>
                        <Button disabled={isPending} onClick={() => create("award", awardForm, () => setAwardForm({ title: "", category: "", organizingBody: "", level: "College" }))}>Add award</Button>
                        <ListTable rows={data.awards.map((item) => ({ id: item._id, title: item.title, detail: [item.category, item.organizingBody, item.level].filter(Boolean).join(" | "), active: item.isActive !== false, kind: "award" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>

                <TabsContent value="skill">
                    <ReferenceSection description="Govern the skill master list used in student records." title="Skills">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Name"><Input value={skillForm.name} onChange={(event) => setSkillForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                            <Field label="Category">
                                <Select value={skillForm.category} onValueChange={(value) => setSkillForm((current) => ({ ...current, category: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["Technical", "SoftSkill", "Domain", "Language", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Button disabled={isPending} onClick={() => create("skill", skillForm, () => setSkillForm({ name: "", category: "Technical" }))}>Add skill</Button>
                        <ListTable rows={data.skills.map((item) => ({ id: item._id, title: item.name, detail: item.category, active: item.isActive !== false, kind: "skill" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>

                <TabsContent value="sport">
                    <ReferenceSection description="Govern sports names used in student records." title="Sports">
                        <Field label="Sport name"><Input value={sportForm.sportName} onChange={(event) => setSportForm({ sportName: event.target.value })} /></Field>
                        <Button disabled={isPending} onClick={() => create("sport", sportForm, () => setSportForm({ sportName: "" }))}>Add sport</Button>
                        <ListTable rows={data.sports.map((item) => ({ id: item._id, title: item.sportName, detail: "", active: item.isActive !== false, kind: "sport" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>

                <TabsContent value="cultural-activity">
                    <ReferenceSection description="Govern cultural activity names used in student records." title="Cultural activities">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Name"><Input value={culturalForm.name} onChange={(event) => setCulturalForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                            <Field label="Category"><Input value={culturalForm.category} onChange={(event) => setCulturalForm((current) => ({ ...current, category: event.target.value }))} /></Field>
                        </div>
                        <Button disabled={isPending} onClick={() => create("cultural-activity", culturalForm, () => setCulturalForm({ name: "", category: "" }))}>Add cultural activity</Button>
                        <ListTable rows={data.culturalActivities.map((item) => ({ id: item._id, title: item.name, detail: item.category ?? "", active: item.isActive !== false, kind: "cultural-activity" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>

                <TabsContent value="social-program">
                    <ReferenceSection description="Govern NSS, NCC, outreach, and social programme masters." title="Social programmes">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Name"><Input value={socialForm.name} onChange={(event) => setSocialForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                            <Field label="Type">
                                <Select value={socialForm.type} onValueChange={(value) => setSocialForm((current) => ({ ...current, type: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["NSS", "NCC", "Social", "Extension", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Description"><Textarea value={socialForm.description} onChange={(event) => setSocialForm((current) => ({ ...current, description: event.target.value }))} /></Field>
                        <Button disabled={isPending} onClick={() => create("social-program", socialForm, () => setSocialForm({ name: "", type: "Social", description: "" }))}>Add social programme</Button>
                        <ListTable rows={data.socialPrograms.map((item) => ({ id: item._id, title: item.name, detail: [item.type, item.description].filter(Boolean).join(" | "), active: item.isActive !== false, kind: "social-program" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>

                <TabsContent value="event">
                    <ReferenceSection description="Govern institutional event masters used by student and faculty event participation records." title="Events">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Title"><Input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                            <Field label="Event type">
                                <Select value={eventForm.eventType} onValueChange={(value) => setEventForm((current) => ({ ...current, eventType: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                            <Field label="Organizer"><Input value={eventForm.organizedBy} onChange={(event) => setEventForm((current) => ({ ...current, organizedBy: event.target.value }))} /></Field>
                            <Field label="Level">
                                <Select value={eventForm.level} onValueChange={(value) => setEventForm((current) => ({ ...current, level: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["College", "State", "National", "International"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                            <Field label="Start date"><Input type="date" value={eventForm.startDate} onChange={(event) => setEventForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
                            <Field label="End date"><Input type="date" value={eventForm.endDate} onChange={(event) => setEventForm((current) => ({ ...current, endDate: event.target.value }))} /></Field>
                        </div>
                        <Field label="Location"><Input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} /></Field>
                        <Button disabled={isPending} onClick={() => create("event", eventForm, () => setEventForm({ title: "", eventType: "Other", organizedBy: "", level: "College", location: "", startDate: "", endDate: "" }))}>Add event</Button>
                        <ListTable rows={data.events.map((item) => ({ id: item._id, title: item.title, detail: [item.eventType, item.organizedBy, item.level, item.location].filter(Boolean).join(" | "), active: item.isActive !== false, kind: "event" }))} onToggle={toggle} />
                    </ReferenceSection>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}

function ReferenceSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function ListTable({
    rows,
    onToggle,
}: {
    rows: Array<{ id: string; title: string; detail: string; active: boolean; kind: string }>;
    onToggle: (kind: string, id: string, nextIsActive: boolean) => void;
}) {
    return (
        <div className="grid gap-3">
            {rows.length ? (
                rows.map((row) => (
                    <div key={row.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-zinc-950">{row.title}</p>
                                <StatusBadge active={row.active} />
                            </div>
                            {row.detail ? <p className="mt-1 text-sm text-zinc-500">{row.detail}</p> : null}
                        </div>
                        <Button onClick={() => onToggle(row.kind, row.id, !row.active)} size="sm" variant="secondary">
                            {row.active ? "Deactivate" : "Activate"}
                        </Button>
                    </div>
                ))
            ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                    No reference records yet.
                </div>
            )}
        </div>
    );
}
