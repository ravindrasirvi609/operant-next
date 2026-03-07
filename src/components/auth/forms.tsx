"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
} from "@/lib/auth/validators";

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type ResendValues = z.infer<typeof resendVerificationSchema>;
type Option = {
    key: string;
    label: string;
    code?: string;
};

async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function AuthCard({
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
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function LoginForm({
    initialMessage,
    defaultEmail,
}: {
    initialMessage?: string;
    defaultEmail?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState(initialMessage ?? "");
    const [errorMessage, setErrorMessage] = useState("");
    const [showResend, setShowResend] = useState(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: defaultEmail ?? "",
            password: "",
        },
    });

    const emailValue = useWatch({ control: form.control, name: "email" });

    function onSubmit(values: LoginValues) {
        setErrorMessage("");
        setSuccessMessage("");

        startTransition(async () => {
            try {
                await postJson("/api/auth/login", values);
                router.push("/");
                router.refresh();
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Unable to sign in.";
                setErrorMessage(message);
                setShowResend(message.toLowerCase().includes("verify your email"));
            }
        });
    }

    return (
        <div className="space-y-6">
            <AuthCard
                title="Sign in to UMIS"
                description="Only verified users can access the UMIS home page. Public access is disabled."
            >
                <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                    {successMessage ? (
                        <FormMessage message={successMessage} type="success" />
                    ) : null}
                    {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                    <div className="grid gap-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                            id="login-email"
                            type="email"
                            placeholder="faculty@university.edu"
                            {...form.register("email")}
                        />
                        <FieldError message={form.formState.errors.email?.message} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="login-password">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-sm font-medium text-zinc-950"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            {...form.register("password")}
                        />
                        <FieldError message={form.formState.errors.password?.message} />
                    </div>

                    <Button className="w-full" size="lg" disabled={isPending} type="submit">
                        {isPending ? <Spinner /> : <ArrowRight className="size-4" />}
                        Sign In
                    </Button>
                </form>
            </AuthCard>

            {showResend ? <ResendVerificationForm defaultEmail={emailValue} /> : null}

            <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500">
                New to UMIS?{" "}
                <Link href="/register" className="font-medium text-zinc-950">
                    Create a student or faculty account
                </Link>
            </div>
        </div>
    );
}

export function RegisterForm({
    collegeOptions,
    schoolOptions,
    departmentOptions,
}: {
    collegeOptions: Option[];
    schoolOptions: Option[];
    departmentOptions: Option[];
}) {
    const router = useRouter();
    const [role, setRole] = useState<"Faculty" | "Student">("Faculty");
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<RegisterValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: "Faculty",
            name: "",
            email: "",
            password: "",
            phone: "",
            collegeName: collegeOptions[0]?.label ?? "",
            department: departmentOptions[0]?.label ?? "",
            schoolName: schoolOptions[0]?.label ?? "",
            designation: "",
        },
    });

    const password = useWatch({
        control: form.control,
        name: "password",
        defaultValue: "",
    });

    const title = useMemo(
        () =>
            role === "Faculty"
                ? "Register faculty access"
                : "Register student access",
        [role]
    );

    function handleRoleChange(nextRole: "Faculty" | "Student") {
        setRole(nextRole);
        form.setValue("role", nextRole);
        setErrorMessage("");
        setSuccessMessage("");
    }

    function onSubmit(values: RegisterValues) {
        setErrorMessage("");
        setSuccessMessage("");

        startTransition(async () => {
            try {
                await postJson("/api/auth/register", values);
                setSuccessMessage(
                    "Registration complete. Verify your email from the message sent to your inbox."
                );
                router.push(
                    `/login?message=${encodeURIComponent(
                        "Registration complete. Verify your email before signing in."
                    )}&email=${encodeURIComponent(values.email)}`
                );
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to register."
                );
            }
        });
    }

    return (
        <AuthCard
            title={title}
            description="Self-service registration is enabled only for Faculty and Student roles."
        >
            <Tabs defaultValue="Faculty" onValueChange={(value) => handleRoleChange(value as "Faculty" | "Student")}>
                <TabsList>
                    <TabsTrigger value="Faculty">Faculty</TabsTrigger>
                    <TabsTrigger value="Student">Student</TabsTrigger>
                </TabsList>

                <form className="mt-6 grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                    {successMessage ? (
                        <FormMessage message={successMessage} type="success" />
                    ) : null}
                    {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                    <input type="hidden" value={role} {...form.register("role")} />

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Full name" id="register-name" error={form.formState.errors.name?.message}>
                            <Input id="register-name" placeholder="Dr. Ananya Rao" {...form.register("name")} />
                        </Field>
                        <Field label="Institution email" id="register-email" error={form.formState.errors.email?.message}>
                            <Input id="register-email" type="email" placeholder="name@university.edu" {...form.register("email")} />
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Phone" id="register-phone" error={form.formState.errors.phone?.message}>
                            <Input id="register-phone" placeholder="+91 9876543210" {...form.register("phone")} />
                        </Field>
                        <Field label="Password" id="register-password" error={form.formState.errors.password?.message}>
                            <Input id="register-password" type="password" placeholder="Create a strong password" {...form.register("password")} />
                        </Field>
                    </div>

                    <PasswordChecklist password={password ?? ""} />

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="College" id="register-college" error={"collegeName" in form.formState.errors ? form.formState.errors.collegeName?.message : undefined}>
                            {collegeOptions.length ? (
                                <Select id="register-college" {...form.register("collegeName")}>
                                    <option value="">Select college</option>
                                    {collegeOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input id="register-college" placeholder="College name" {...form.register("collegeName")} />
                            )}
                        </Field>
                        <Field label="School" id="register-school" error={form.formState.errors.schoolName?.message}>
                            {schoolOptions.length ? (
                                <Select id="register-school" {...form.register("schoolName")}>
                                    <option value="">Select school</option>
                                    {schoolOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input id="register-school" placeholder="School of Engineering" {...form.register("schoolName")} />
                            )}
                        </Field>
                        <Field label="Department" id="register-department" error={form.formState.errors.department?.message}>
                            {departmentOptions.length ? (
                                <Select id="register-department" {...form.register("department")}>
                                    <option value="">Select department</option>
                                    {departmentOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input id="register-department" placeholder="Computer Science" {...form.register("department")} />
                            )}
                        </Field>
                    </div>

                    <TabsContent value="Faculty" forceMount className={role === "Faculty" ? "block" : "hidden"}>
                        <Field label="Designation" id="register-designation" error={"designation" in form.formState.errors ? form.formState.errors.designation?.message : undefined}>
                            <Input id="register-designation" placeholder="Associate Professor" {...form.register("designation")} />
                        </Field>
                    </TabsContent>

                    <TabsContent value="Student" forceMount className={role === "Student" ? "grid gap-5" : "hidden"}>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Roll number" id="register-roll" error={"rollNo" in form.formState.errors ? form.formState.errors.rollNo?.message : undefined}>
                                <Input id="register-roll" placeholder="UMIS24CS101" {...form.register("rollNo")} />
                            </Field>
                            <Field label="Course" id="register-course" error={"course" in form.formState.errors ? form.formState.errors.course?.message : undefined}>
                                <Input id="register-course" placeholder="B.Tech CSE" {...form.register("course")} />
                            </Field>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Batch" id="register-batch" error={"batch" in form.formState.errors ? form.formState.errors.batch?.message : undefined}>
                                <Input id="register-batch" placeholder="2024-2028" {...form.register("batch")} />
                            </Field>
                            <Field label="Admission year" id="register-admission-year" error={"admissionYear" in form.formState.errors ? form.formState.errors.admissionYear?.message : undefined}>
                                <Input id="register-admission-year" placeholder="2024" {...form.register("admissionYear")} />
                            </Field>
                        </div>
                    </TabsContent>

                    <Separator className="my-1" />

                    <Button className="w-full" size="lg" disabled={isPending} type="submit">
                        {isPending ? <Spinner /> : <ArrowRight className="size-4" />}
                        Create Account
                    </Button>
                </form>
            </Tabs>

            <div className="mt-5 text-sm text-zinc-500">
                Already registered?{" "}
                <Link href="/login" className="font-medium text-zinc-950">
                    Sign in here
                </Link>
            </div>
        </AuthCard>
    );
}

export function ForgotPasswordForm() {
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    function onSubmit(values: ForgotPasswordValues) {
        setSuccessMessage("");
        setErrorMessage("");

        startTransition(async () => {
            try {
                const data = await postJson("/api/auth/forgot-password", values);
                setSuccessMessage(data.message ?? "Check your email for reset instructions.");
                form.reset();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to send reset link."
                );
            }
        });
    }

    return (
        <AuthCard
            title="Forgot your password?"
            description="Request a reset link. If the account exists and is verified, the email will arrive immediately."
        >
            <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                {successMessage ? <FormMessage message={successMessage} type="success" /> : null}
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <Field label="UMIS email" id="forgot-email" error={form.formState.errors.email?.message}>
                    <Input id="forgot-email" type="email" placeholder="student@university.edu" {...form.register("email")} />
                </Field>

                <Button className="w-full" disabled={isPending} type="submit">
                    {isPending ? <Spinner /> : <MailCheck className="size-4" />}
                    Send Reset Link
                </Button>
            </form>

            <div className="mt-5 text-sm text-zinc-500">
                Remembered it?{" "}
                <Link href="/login" className="font-medium text-zinc-950">
                    Back to sign in
                </Link>
            </div>
        </AuthCard>
    );
}

export function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token,
            password: "",
            confirmPassword: "",
        },
    });

    const password = useWatch({
        control: form.control,
        name: "password",
        defaultValue: "",
    });

    function onSubmit(values: ResetPasswordValues) {
        setSuccessMessage("");
        setErrorMessage("");

        startTransition(async () => {
            try {
                const data = await postJson("/api/auth/reset-password", values);
                setSuccessMessage(data.message ?? "Password updated.");
                router.push("/");
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to reset password."
                );
            }
        });
    }

    return (
        <AuthCard
            title="Reset your password"
            description="Create a fresh password for your UMIS account. Successful reset signs you in immediately."
        >
            <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                {successMessage ? <FormMessage message={successMessage} type="success" /> : null}
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <input type="hidden" value={token} {...form.register("token")} />

                <Field label="New password" id="reset-password" error={form.formState.errors.password?.message}>
                    <Input id="reset-password" type="password" placeholder="Create a strong password" {...form.register("password")} />
                </Field>

                <PasswordChecklist password={password ?? ""} />

                <Field
                    label="Confirm password"
                    id="reset-confirm-password"
                    error={form.formState.errors.confirmPassword?.message}
                >
                    <Input
                        id="reset-confirm-password"
                        type="password"
                        placeholder="Re-enter the password"
                        {...form.register("confirmPassword")}
                    />
                </Field>

                <Button className="w-full" disabled={isPending} type="submit">
                    {isPending ? <Spinner /> : <ArrowRight className="size-4" />}
                    Update Password
                </Button>
            </form>
        </AuthCard>
    );
}

export function ResendVerificationForm({ defaultEmail = "" }: { defaultEmail?: string }) {
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<ResendValues>({
        resolver: zodResolver(resendVerificationSchema),
        defaultValues: {
            email: defaultEmail,
        },
    });

    function onSubmit(values: ResendValues) {
        setSuccessMessage("");
        setErrorMessage("");

        startTransition(async () => {
            try {
                const data = await postJson("/api/auth/resend-verification", values);
                setSuccessMessage(data.message ?? "Verification email sent.");
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to resend verification email."
                );
            }
        });
    }

    return (
        <Card className="border-dashed bg-white/85">
            <CardHeader>
                <CardTitle className="text-xl">Need a fresh verification email?</CardTitle>
                <CardDescription>
                    If your account is still pending verification, resend the activation link here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-2">
                        <Label htmlFor="resend-email">Email</Label>
                        <Input id="resend-email" type="email" placeholder="you@university.edu" {...form.register("email")} />
                        <FieldError message={form.formState.errors.email?.message} />
                    </div>
                    <Button className="sm:self-end" disabled={isPending} type="submit">
                        {isPending ? <Spinner /> : null}
                        Resend Link
                    </Button>
                </form>
                {successMessage ? (
                    <div className="mt-4">
                        <FormMessage message={successMessage} type="success" />
                    </div>
                ) : null}
                {errorMessage ? (
                    <div className="mt-4">
                        <FormMessage message={errorMessage} type="error" />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

function Field({
    label,
    id,
    error,
    children,
}: {
    label: string;
    id: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <FieldError message={error} />
        </div>
    );
}
