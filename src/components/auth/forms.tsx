"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AtSign, IdCard, MailCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage } from "@/components/auth/auth-helpers";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
    facultyActivationSchema,
    forgotPasswordSchema,
    loginSchema,
    resendVerificationSchema,
    resetPasswordSchema,
    studentActivationSchema,
} from "@/lib/auth/validators";

type LoginValues = z.infer<typeof loginSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type ResendValues = z.infer<typeof resendVerificationSchema>;
type StudentActivationValues = z.infer<typeof studentActivationSchema>;
type FacultyActivationValues = z.infer<typeof facultyActivationSchema>;

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
    footer,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <Card className="overflow-hidden rounded-[28px] border border-border/80 bg-card/95 shadow-[0_24px_60px_-32px_color-mix(in_oklch,var(--foreground)_35%,transparent)] backdrop-blur">
            <CardHeader className="gap-2 border-b border-border/80 bg-muted/70 px-6 py-5">
                <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">{children}</CardContent>
            {footer ? <CardFooter className="border-t border-border/80 bg-muted/50 px-6 py-5">{footer}</CardFooter> : null}
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
                const data = (await postJson("/api/auth/login", values)) as {
                    redirectPath?: string;
                };
                router.push(data.redirectPath ?? "/");
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
                description="Continue to the Operant Next University portal with your institutional email or your enrollment number after first-time activation."
                footer={
                    <div className="text-sm text-muted-foreground">
                        First time student?{" "}
                        <Link href="/activate-student" className="font-medium text-foreground">
                            Activate your account
                        </Link>
                        {" · "}
                        <Link href="/activate-faculty" className="font-medium text-foreground">
                            Faculty first-time setup
                        </Link>
                    </div>
                }
            >
                <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                    {successMessage ? (
                        <FormMessage message={successMessage} type="success" />
                    ) : null}
                    {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                    <div className="grid gap-2">
                        <Label htmlFor="login-email">Institutional email or enrollment number</Label>
                        <InputGroup>
                            <InputGroupAddon>
                                <AtSign aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="login-email"
                                placeholder="you@university.edu or 24CSE001"
                                {...form.register("email")}
                            />
                        </InputGroup>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Use the identifier linked to your university record.
                        </p>
                        <FieldError message={form.formState.errors.email?.message} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="login-password">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-sm font-medium text-foreground"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <PasswordInput
                            id="login-password"
                            placeholder="Enter your password"
                            {...form.register("password")}
                        />
                        <FieldError message={form.formState.errors.password?.message} />
                    </div>

                    <Button loading={isPending} className="w-full" size="lg" disabled={isPending} type="submit">
                        <ArrowRight aria-hidden />
                        Sign In
                    </Button>
                </form>
            </AuthCard>

            {showResend ? <ResendVerificationForm defaultEmail={emailValue} /> : null}
        </div>
    );
}

export function RegisterForm({
}: {
    universityOptions: unknown[];
    collegeOptions: unknown[];
    departmentOptions: unknown[];
}) {
    return (
        <AuthCard
            title="Institutional onboarding only"
            description="Faculty accounts are now provisioned by the institution. If your profile is already created, complete first-time setup instead of registering."
            footer={
                <div className="text-sm text-muted-foreground">
                    Need access?{" "}
                    <Link href="/activate-faculty" className="font-medium text-foreground">
                        Activate faculty account
                    </Link>
                    {" · "}
                    <Link href="/activate-student" className="font-medium text-foreground">
                        Activate student account
                    </Link>
                </div>
            }
        >
            <div className="grid gap-4 text-sm text-muted-foreground">
                <p>
                    Faculty identities are created by Admin, HR, or IQAC. Public self-registration is disabled to keep institutional mapping and accreditation data accurate.
                </p>
                <p>
                    If your institutional profile has already been provisioned, use first-time setup with your employee code and institutional email.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/activate-faculty">First Time Faculty Login Setup</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/login">Back to sign in</Link>
                    </Button>
                </div>
            </div>
        </AuthCard>
    );
}

export function StudentActivationForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<StudentActivationValues>({
        resolver: zodResolver(studentActivationSchema),
        defaultValues: {
            enrollmentNo: "",
            verificationValue: "",
            password: "",
            confirmPassword: "",
        },
    });

    const password = useWatch({
        control: form.control,
        name: "password",
        defaultValue: "",
    });

    function onSubmit(values: StudentActivationValues) {
        setErrorMessage("");
        setSuccessMessage("");

        startTransition(async () => {
            try {
                const data = (await postJson("/api/auth/activate-student", values)) as {
                    message?: string;
                    redirectPath?: string;
                };
                setSuccessMessage(data.message ?? "Student account activated.");
                router.push(data.redirectPath ?? "/student");
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to activate account."
                );
            }
        });
    }

    return (
        <AuthCard
            title="First Time Student Login Setup"
            description="Use your pre-provisioned institutional record to verify your identity and set your password."
            footer={
                <div className="text-sm text-muted-foreground">
                    Already activated?{" "}
                    <Link href="/login" className="font-medium text-foreground">
                        Sign in here
                    </Link>
                </div>
            }
        >
            <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                {successMessage ? <FormMessage message={successMessage} type="success" /> : null}
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <Field label="Enrollment number" id="activate-enrollment" error={form.formState.errors.enrollmentNo?.message}>
                    <InputGroup>
                            <InputGroupAddon>
                                <IdCard aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="activate-enrollment" placeholder="CSE2024001" {...form.register("enrollmentNo")} />
                        </InputGroup>
                </Field>

                <Field label="Registered email or mobile" id="activate-verification" error={form.formState.errors.verificationValue?.message}>
                    <InputGroup>
                            <InputGroupAddon>
                                <AtSign aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="activate-verification" placeholder="ravi@college.edu or 9876543210" {...form.register("verificationValue")} />
                        </InputGroup>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Set password" id="activate-password" error={form.formState.errors.password?.message}>
                        <PasswordInput id="activate-password" {...form.register("password")} />
                    </Field>
                    <Field label="Confirm password" id="activate-confirm-password" error={form.formState.errors.confirmPassword?.message}>
                        <PasswordInput id="activate-confirm-password" {...form.register("confirmPassword")} />
                    </Field>
                </div>

                <PasswordChecklist password={password ?? ""} />

                <Button loading={isPending} className="w-full" size="lg" disabled={isPending} type="submit">
                    <ArrowRight aria-hidden />
                    Activate Student Account
                </Button>
            </form>
        </AuthCard>
    );
}

export function FacultyActivationForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<FacultyActivationValues>({
        resolver: zodResolver(facultyActivationSchema),
        defaultValues: {
            employeeCode: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const password = useWatch({
        control: form.control,
        name: "password",
        defaultValue: "",
    });

    function onSubmit(values: FacultyActivationValues) {
        setErrorMessage("");
        setSuccessMessage("");

        startTransition(async () => {
            try {
                const data = (await postJson("/api/auth/activate-faculty", values)) as {
                    message?: string;
                    redirectPath?: string;
                };
                setSuccessMessage(data.message ?? "Faculty account activated.");
                router.push(data.redirectPath ?? "/faculty");
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to activate account."
                );
            }
        });
    }

    return (
        <AuthCard
            title="First Time Faculty Login Setup"
            description="Use your pre-provisioned institutional faculty record to verify your identity and set your password."
            footer={
                <div className="text-sm text-muted-foreground">
                    Already activated?{" "}
                    <Link href="/login" className="font-medium text-foreground">
                        Sign in here
                    </Link>
                </div>
            }
        >
            <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                {successMessage ? <FormMessage message={successMessage} type="success" /> : null}
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Employee code" id="activate-faculty-code" error={form.formState.errors.employeeCode?.message}>
                        <InputGroup>
                            <InputGroupAddon>
                                <IdCard aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="activate-faculty-code" placeholder="CSE-FAC-001" {...form.register("employeeCode")} />
                        </InputGroup>
                    </Field>
                    <Field label="Institution email" id="activate-faculty-email" error={form.formState.errors.email?.message}>
                        <InputGroup>
                            <InputGroupAddon>
                                <AtSign aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="activate-faculty-email" type="email" placeholder="faculty@college.edu" {...form.register("email")} />
                        </InputGroup>
                    </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Set password" id="activate-faculty-password" error={form.formState.errors.password?.message}>
                        <PasswordInput id="activate-faculty-password" {...form.register("password")} />
                    </Field>
                    <Field label="Confirm password" id="activate-faculty-confirm-password" error={form.formState.errors.confirmPassword?.message}>
                        <PasswordInput id="activate-faculty-confirm-password" {...form.register("confirmPassword")} />
                    </Field>
                </div>

                <PasswordChecklist password={password ?? ""} />

                <Button loading={isPending} className="w-full" size="lg" disabled={isPending} type="submit">
                    <ArrowRight aria-hidden />
                    Activate Faculty Account
                </Button>
            </form>
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
                    <InputGroup>
                            <InputGroupAddon>
                                <AtSign aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="forgot-email" type="email" placeholder="student@university.edu" {...form.register("email")} />
                        </InputGroup>
                </Field>

                <Button loading={isPending} className="w-full" disabled={isPending} type="submit">
                    <MailCheck aria-hidden />
                    Send Reset Link
                </Button>
            </form>

            <div className="mt-5 text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/login" className="font-medium text-foreground">
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
                    <PasswordInput id="reset-password" placeholder="Create a strong password" {...form.register("password")} />
                </Field>

                <PasswordChecklist password={password ?? ""} />

                <Field
                    label="Confirm password"
                    id="reset-confirm-password"
                    error={form.formState.errors.confirmPassword?.message}
                >
                    <PasswordInput
                        id="reset-confirm-password"
                        placeholder="Re-enter the password"
                        {...form.register("confirmPassword")}
                    />
                </Field>

                <Button loading={isPending} className="w-full" disabled={isPending} type="submit">
                    <ArrowRight aria-hidden />
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
        <Card className="border-dashed bg-card/85">
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
                        <InputGroup>
                            <InputGroupAddon>
                                <AtSign aria-hidden />
                            </InputGroupAddon>
                            <InputGroupInput id="resend-email" type="email" placeholder="you@university.edu" {...form.register("email")} />
                        </InputGroup>
                        <FieldError message={form.formState.errors.email?.message} />
                    </div>
                    <Button loading={isPending} className="sm:self-end" disabled={isPending} type="submit">
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
