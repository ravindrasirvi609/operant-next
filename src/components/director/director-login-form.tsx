"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/auth/validators";

type DirectorLoginValues = z.infer<typeof loginSchema>;

export function DirectorLoginForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<DirectorLoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    function onSubmit(values: DirectorLoginValues) {
        setErrorMessage("");

        startTransition(async () => {
            const response = await fetch("/api/auth/director-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setErrorMessage(data.message ?? "Unable to sign in.");
                return;
            }

            router.push("/director");
            router.refresh();
        });
    }

    return (
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

            <div className="grid gap-2">
                <Label htmlFor="director-email">Email</Label>
                <Input id="director-email" type="email" {...form.register("email")} />
                <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="director-password">Password</Label>
                <Input id="director-password" type="password" {...form.register("password")} />
                <FieldError message={form.formState.errors.password?.message} />
            </div>

            <Button disabled={isPending} type="submit">
                {isPending ? <Spinner /> : null}
                Open Leadership Portal
            </Button>
        </form>
    );
}
