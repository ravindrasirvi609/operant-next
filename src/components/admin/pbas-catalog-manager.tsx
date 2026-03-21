"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pbasScoringWeightsSchema } from "@/lib/pbas/validators";

type PbasCategory = {
    _id: string;
    categoryCode: string;
    categoryName: string;
    maxScore: number;
    displayOrder: number;
};

type PbasIndicator = {
    _id: string;
    categoryId?: { _id?: string; categoryCode?: string; categoryName?: string } | string;
    indicatorCode: string;
    indicatorName: string;
    description?: string;
    maxScore: number;
    naacCriteriaCode?: string;
};

type PbasScoringSettings = {
    submissionDeadline?: string;
    scoringWeights: Record<string, unknown>;
};

const PBAS_SCORING_TEMPLATE = {
    caps: {
        teachingActivities: 100,
        researchAcademicContribution: 120,
        institutionalResponsibilities: 80,
    },
    category1: {
        classesTaken: 2,
        coursePreparationHours: 0.4,
        coursesTaught: 4,
        mentoringCount: 3,
        labSupervisionCount: 3,
    },
    category2: {
        researchPaperHigh: 15,
        researchPaperMedium: 10,
        researchPaperDefault: 6,
        book: 18,
        patentGranted: 20,
        patentPublished: 12,
        patentDefault: 8,
        conferenceInternational: 8,
        conferenceNational: 5,
        conferenceDefault: 3,
        projectLargeAmount: 1000000,
        projectMediumAmount: 250000,
        projectLarge: 15,
        projectMedium: 10,
        projectDefault: 6,
    },
    category3: {
        committee: 4,
        administrativeDuty: 5,
        examDuty: 3,
        studentGuidancePerUnit: 1,
        studentGuidanceMaxPerEntry: 10,
        extensionActivity: 4,
    },
    phase2: {
        innovativePedagogyPoints: 5,
        curriculumDevPerCourse: 2,
        econtentDevelopmentPerItem: 2,
        studentFeedbackDivisor: 10,
        assessmentInnovationPerHighOutcome: 2,
        researchGuidanceCompleted: 10,
        researchGuidanceOngoing: 5,
        consultancyPerProject: 5,
        researchEcontentPerItem: 3,
        moocCompletionPerCourse: 2,
        awardsInternational: 4,
        awardsNational: 3,
        awardsState: 2,
        awardsCollege: 1,
        researchImpactHigh: 3,
        researchImpactMedium: 2,
        researchImpactLow: 1,
        editorialReviewPerRole: 2,
        fdpPerItem: 3,
        professionalBodyPerMembership: 2,
        communityServicePerActivity: 2,
        outreachPerActivity: 2,
        resourcePersonPerEvent: 2,
        governancePerRole: 2,
    },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeMissingKeys<T extends Record<string, unknown>>(
    currentValue: unknown,
    templateValue: T
): T {
    const current = isPlainObject(currentValue) ? currentValue : {};
    const merged: Record<string, unknown> = { ...current };

    for (const [key, templateEntry] of Object.entries(templateValue)) {
        const currentEntry = current[key];
        if (isPlainObject(templateEntry)) {
            merged[key] = deepMergeMissingKeys(currentEntry, templateEntry);
            continue;
        }

        if (currentEntry === undefined) {
            merged[key] = templateEntry;
        }
    }

    return merged as T;
}

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data?.message || "Request failed.");
    }
    return data;
}

function emptyCategoryForm() {
    return {
        categoryCode: "",
        categoryName: "",
        maxScore: 0,
        displayOrder: 1,
    };
}

function emptyIndicatorForm(categoryId?: string) {
    return {
        categoryId: categoryId ?? "",
        indicatorCode: "",
        indicatorName: "",
        description: "",
        maxScore: 0,
        naacCriteriaCode: "",
    };
}

function formatIssuePath(path: Array<PropertyKey>) {
    if (!path.length) {
        return "scoringWeights";
    }

    const normalized = path.map((segment) =>
        typeof segment === "symbol" ? segment.toString() : segment
    );

    return `scoringWeights.${normalized.join(".")}`;
}

export function PbasCatalogManager({
    initialCategories,
    initialIndicators,
    initialSettings,
}: {
    initialCategories: PbasCategory[];
    initialIndicators: PbasIndicator[];
    initialSettings: PbasScoringSettings;
}) {
    const [categories, setCategories] = useState<PbasCategory[]>(initialCategories);
    const [indicators, setIndicators] = useState<PbasIndicator[]>(initialIndicators);
    const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
    const [indicatorForm, setIndicatorForm] = useState(emptyIndicatorForm());
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
    const [categoryMessage, setCategoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [indicatorMessage, setIndicatorMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [seedMessage, setSeedMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [submissionDeadline, setSubmissionDeadline] = useState(initialSettings.submissionDeadline ?? "");
    const [scoringWeightsText, setScoringWeightsText] = useState(
        JSON.stringify(initialSettings.scoringWeights, null, 2)
    );
    const [isPending, startTransition] = useTransition();
    const [isSeeding, startSeedTransition] = useTransition();
    const [isSavingSettings, startSettingsTransition] = useTransition();

    const scoringWeightsValidation = useMemo(() => {
        try {
            const parsedJson = JSON.parse(scoringWeightsText);
            const parsed = pbasScoringWeightsSchema.safeParse(parsedJson);

            if (parsed.success) {
                return { valid: true, errors: [] as string[] };
            }

            return {
                valid: false,
                errors: parsed.error.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`),
            };
        } catch (error) {
            return {
                valid: false,
                errors: [error instanceof Error ? `JSON parse error: ${error.message}` : "Invalid JSON."],
            };
        }
    }, [scoringWeightsText]);

    const categoryOptions = useMemo(() => {
        return [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    }, [categories]);

    const filteredIndicators = useMemo(() => {
        if (filterCategory === "all") {
            return indicators;
        }
        return indicators.filter((indicator) => {
            const categoryId =
                typeof indicator.categoryId === "string"
                    ? indicator.categoryId
                    : indicator.categoryId?._id;
            return categoryId === filterCategory;
        });
    }, [indicators, filterCategory]);

    function resetCategoryForm() {
        setEditingCategoryId(null);
        setCategoryForm(emptyCategoryForm());
    }

    function resetIndicatorForm() {
        setEditingIndicatorId(null);
        setIndicatorForm(emptyIndicatorForm());
    }

    function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCategoryMessage(null);

        startTransition(async () => {
            try {
                if (editingCategoryId) {
                    const data = await requestJson<{ category: PbasCategory }>(
                        `/api/admin/pbas/categories/${editingCategoryId}`,
                        {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(categoryForm),
                        }
                    );
                    setCategories((current) =>
                        current.map((item) => (item._id === editingCategoryId ? data.category : item))
                    );
                    setCategoryMessage({ type: "success", text: "PBAS category updated." });
                } else {
                    const data = await requestJson<{ category: PbasCategory }>(
                        "/api/admin/pbas/categories",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(categoryForm),
                        }
                    );
                    setCategories((current) => [data.category, ...current]);
                    setCategoryMessage({ type: "success", text: "PBAS category created." });
                }
                resetCategoryForm();
            } catch (error) {
                setCategoryMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save PBAS category.",
                });
            }
        });
    }

    function handleIndicatorSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIndicatorMessage(null);

        startTransition(async () => {
            try {
                if (editingIndicatorId) {
                    const data = await requestJson<{ indicator: PbasIndicator }>(
                        `/api/admin/pbas/indicators/${editingIndicatorId}`,
                        {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(indicatorForm),
                        }
                    );
                    setIndicators((current) =>
                        current.map((item) => (item._id === editingIndicatorId ? data.indicator : item))
                    );
                    setIndicatorMessage({ type: "success", text: "PBAS indicator updated." });
                } else {
                    const data = await requestJson<{ indicator: PbasIndicator }>(
                        "/api/admin/pbas/indicators",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(indicatorForm),
                        }
                    );
                    setIndicators((current) => [data.indicator, ...current]);
                    setIndicatorMessage({ type: "success", text: "PBAS indicator created." });
                }
                resetIndicatorForm();
            } catch (error) {
                setIndicatorMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save PBAS indicator.",
                });
            }
        });
    }

    function handleSeedCatalog() {
        setSeedMessage(null);
        startSeedTransition(async () => {
            try {
                await requestJson<{ message: string }>("/api/admin/pbas/seed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ overwrite: false }),
                });

                const [categoryData, indicatorData] = await Promise.all([
                    requestJson<{ categories: PbasCategory[] }>("/api/admin/pbas/categories"),
                    requestJson<{ indicators: PbasIndicator[] }>("/api/admin/pbas/indicators"),
                ]);

                setCategories(categoryData.categories);
                setIndicators(indicatorData.indicators);
                setSeedMessage({ type: "success", text: "PBAS catalog seeded with the default UGC/NAAC set." });
            } catch (error) {
                setSeedMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to seed PBAS catalog.",
                });
            }
        });
    }

    function handleSaveSettings() {
        setSettingsMessage(null);

        if (!scoringWeightsValidation.valid) {
            setSettingsMessage({ type: "error", text: "Fix scoring weight validation errors before saving." });
            return;
        }

        startSettingsTransition(async () => {
            try {
                const parsedWeights = JSON.parse(scoringWeightsText);
                const data = await requestJson<{ settings: PbasScoringSettings }>("/api/admin/pbas/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        submissionDeadline,
                        scoringWeights: parsedWeights,
                    }),
                });

                setSubmissionDeadline(data.settings.submissionDeadline ?? "");
                setScoringWeightsText(JSON.stringify(data.settings.scoringWeights, null, 2));
                setSettingsMessage({ type: "success", text: "PBAS scoring settings updated." });
            } catch (error) {
                setSettingsMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to update PBAS settings.",
                });
            }
        });
    }

    function handleLoadScoringTemplate() {
        setSettingsMessage(null);
        setScoringWeightsText(JSON.stringify(PBAS_SCORING_TEMPLATE, null, 2));
        setSettingsMessage({
            type: "success",
            text: "Default PBAS scoring template loaded. Review values and save settings to apply.",
        });
    }

    function handleMergeMissingScoringKeys() {
        setSettingsMessage(null);

        try {
            const parsed = JSON.parse(scoringWeightsText);
            const merged = deepMergeMissingKeys(parsed, PBAS_SCORING_TEMPLATE);
            setScoringWeightsText(JSON.stringify(merged, null, 2));
            setSettingsMessage({
                type: "success",
                text: "Missing scoring keys added from default template. Existing custom values were preserved.",
            });
        } catch (error) {
            setSettingsMessage({
                type: "error",
                text: error instanceof Error
                    ? `Unable to merge missing keys: ${error.message}`
                    : "Unable to merge missing keys. Fix JSON first.",
            });
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>PBAS Scoring Settings</CardTitle>
                    <CardDescription>
                        Configure submission deadline and scoring weights used by the PBAS scoring engine.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {settingsMessage ? <FormMessage message={settingsMessage.text} type={settingsMessage.type} /> : null}
                    <Field label="Submission Deadline (YYYY-MM-DD)">
                        <Input
                            type="date"
                            value={submissionDeadline}
                            onChange={(event) => setSubmissionDeadline(event.target.value)}
                            disabled={isSavingSettings}
                        />
                    </Field>
                    <Field label="Scoring Weights JSON">
                        <textarea
                            value={scoringWeightsText}
                            onChange={(event) => setScoringWeightsText(event.target.value)}
                            disabled={isSavingSettings}
                            className={`min-h-[280px] w-full rounded-md bg-white px-3 py-2 text-sm font-mono ${
                                scoringWeightsValidation.valid
                                    ? "border border-zinc-200"
                                    : "border border-rose-300 bg-rose-50"
                            }`}
                        />
                    </Field>
                    {scoringWeightsValidation.valid ? (
                        <p className="text-xs text-emerald-700">Scoring weights JSON is valid.</p>
                    ) : (
                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                            <p className="font-medium">Fix these fields before saving:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {scoringWeightsValidation.errors.map((errorText) => (
                                    <li key={errorText}>{errorText}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleMergeMissingScoringKeys}
                            disabled={isSavingSettings}
                        >
                            Merge Missing Keys
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleLoadScoringTemplate}
                            disabled={isSavingSettings}
                        >
                            Load Default Template
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings || !scoringWeightsValidation.valid}
                        >
                            {isSavingSettings ? <Spinner /> : null}
                            Save PBAS Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>PBAS Catalog Configuration</CardTitle>
                    <CardDescription>
                        Manage PBAS master categories and indicators. Seed with the default UGC/NAAC catalog or add institution-specific entries.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        {categories.length} Categories | {indicators.length} Indicators
                    </div>
                    <Button type="button" onClick={handleSeedCatalog} disabled={isSeeding}>
                        {isSeeding ? <Spinner /> : null}
                        Seed Default Catalog
                    </Button>
                    {seedMessage ? <FormMessage message={seedMessage.text} type={seedMessage.type} /> : null}
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>{editingCategoryId ? "Edit Category" : "Create Category"}</CardTitle>
                        <CardDescription>Define the PBAS category structure and scoring limits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {categoryMessage ? <FormMessage message={categoryMessage.text} type={categoryMessage.type} /> : null}
                        <form className="grid gap-4" onSubmit={handleCategorySubmit}>
                            <Field label="Category code">
                                <Input
                                    value={categoryForm.categoryCode}
                                    onChange={(event) =>
                                        setCategoryForm((current) => ({ ...current, categoryCode: event.target.value }))
                                    }
                                    placeholder="A"
                                    disabled={isPending}
                                />
                            </Field>
                            <Field label="Category name">
                                <Input
                                    value={categoryForm.categoryName}
                                    onChange={(event) =>
                                        setCategoryForm((current) => ({ ...current, categoryName: event.target.value }))
                                    }
                                    placeholder="Teaching and Learning"
                                    disabled={isPending}
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Max score">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={categoryForm.maxScore}
                                        onChange={(event) =>
                                            setCategoryForm((current) => ({
                                                ...current,
                                                maxScore: Number(event.target.value),
                                            }))
                                        }
                                        disabled={isPending}
                                    />
                                </Field>
                                <Field label="Display order">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={categoryForm.displayOrder}
                                        onChange={(event) =>
                                            setCategoryForm((current) => ({
                                                ...current,
                                                displayOrder: Number(event.target.value),
                                            }))
                                        }
                                        disabled={isPending}
                                    />
                                </Field>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingCategoryId ? "Update Category" : "Create Category"}
                                </Button>
                                {editingCategoryId ? (
                                    <Button type="button" variant="secondary" onClick={resetCategoryForm}>
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Ordering and scoring limits for PBAS categories.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {categoryOptions.length ? categoryOptions.map((category) => (
                            <div key={category._id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge>{category.categoryCode}</Badge>
                                            <p className="font-semibold text-zinc-950">{category.categoryName}</p>
                                        </div>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            Max score {category.maxScore} | Order {category.displayOrder}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingCategoryId(category._id);
                                            setCategoryForm({
                                                categoryCode: category.categoryCode,
                                                categoryName: category.categoryName,
                                                maxScore: category.maxScore,
                                                displayOrder: category.displayOrder,
                                            });
                                        }}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No PBAS categories found yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>{editingIndicatorId ? "Edit Indicator" : "Create Indicator"}</CardTitle>
                        <CardDescription>Manage PBAS indicators and NAAC criteria mapping.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {indicatorMessage ? <FormMessage message={indicatorMessage.text} type={indicatorMessage.type} /> : null}
                        <form className="grid gap-4" onSubmit={handleIndicatorSubmit}>
                            <Field label="Category">
                                <Select
                                    value={indicatorForm.categoryId || undefined}
                                    onValueChange={(value) =>
                                        setIndicatorForm((current) => ({ ...current, categoryId: value }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((category) => (
                                            <SelectItem key={category._id} value={category._id}>
                                                {category.categoryCode} - {category.categoryName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Indicator code">
                                <Input
                                    value={indicatorForm.indicatorCode}
                                    onChange={(event) =>
                                        setIndicatorForm((current) => ({
                                            ...current,
                                            indicatorCode: event.target.value,
                                        }))
                                    }
                                    placeholder="A1_TEACHING_LOAD"
                                    disabled={isPending}
                                />
                            </Field>
                            <Field label="Indicator name">
                                <Input
                                    value={indicatorForm.indicatorName}
                                    onChange={(event) =>
                                        setIndicatorForm((current) => ({
                                            ...current,
                                            indicatorName: event.target.value,
                                        }))
                                    }
                                    placeholder="Lectures / Classes Taken"
                                    disabled={isPending}
                                />
                            </Field>
                            <Field label="Description">
                                <Input
                                    value={indicatorForm.description}
                                    onChange={(event) =>
                                        setIndicatorForm((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    placeholder="Optional description"
                                    disabled={isPending}
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Max score">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={indicatorForm.maxScore}
                                        onChange={(event) =>
                                            setIndicatorForm((current) => ({
                                                ...current,
                                                maxScore: Number(event.target.value),
                                            }))
                                        }
                                        disabled={isPending}
                                    />
                                </Field>
                                <Field label="NAAC criteria code">
                                    <Input
                                        value={indicatorForm.naacCriteriaCode}
                                        onChange={(event) =>
                                            setIndicatorForm((current) => ({
                                                ...current,
                                                naacCriteriaCode: event.target.value,
                                            }))
                                        }
                                        placeholder="CR2"
                                        disabled={isPending}
                                    />
                                </Field>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingIndicatorId ? "Update Indicator" : "Create Indicator"}
                                </Button>
                                {editingIndicatorId ? (
                                    <Button type="button" variant="secondary" onClick={resetIndicatorForm}>
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Indicators</CardTitle>
                        <CardDescription>Indicator codes, NAAC criteria, and scoring setup.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Filter by category">
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Filter category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All categories</SelectItem>
                                        {categoryOptions.map((category) => (
                                            <SelectItem key={category._id} value={category._id}>
                                                {category.categoryCode} - {category.categoryName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <div className="grid gap-3">
                            {filteredIndicators.length ? filteredIndicators.map((indicator) => {
                                const category =
                                    typeof indicator.categoryId === "string"
                                        ? categoryOptions.find((item) => item._id === indicator.categoryId)
                                        : indicator.categoryId;

                                return (
                                    <div key={indicator._id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge>{indicator.indicatorCode}</Badge>
                                                    <p className="font-semibold text-zinc-950">{indicator.indicatorName}</p>
                                                </div>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    Category {category?.categoryCode ?? "--"} | Max {indicator.maxScore} | NAAC {indicator.naacCriteriaCode ?? "--"}
                                                </p>
                                                {indicator.description ? (
                                                    <p className="mt-1 text-xs text-zinc-500">{indicator.description}</p>
                                                ) : null}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    setEditingIndicatorId(indicator._id);
                                                    setIndicatorForm({
                                                        categoryId:
                                                            typeof indicator.categoryId === "string"
                                                                ? indicator.categoryId
                                                                : indicator.categoryId?._id ?? "",
                                                        indicatorCode: indicator.indicatorCode,
                                                        indicatorName: indicator.indicatorName,
                                                        description: indicator.description ?? "",
                                                        maxScore: indicator.maxScore,
                                                        naacCriteriaCode: indicator.naacCriteriaCode ?? "",
                                                    });
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                    No PBAS indicators found yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
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
