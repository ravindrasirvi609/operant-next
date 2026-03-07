"use client";

const requirements = [
    { label: "At least 8 characters", check: (value: string) => value.length >= 8 },
    { label: "One uppercase letter", check: (value: string) => /[A-Z]/.test(value) },
    { label: "One lowercase letter", check: (value: string) => /[a-z]/.test(value) },
    { label: "One number", check: (value: string) => /\d/.test(value) },
    { label: "One special character", check: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordChecklist({ password }: { password: string }) {
    return (
        <div className="grid gap-2 rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Password Rules
            </p>
            <div className="grid gap-1">
                {requirements.map((item) => {
                    const isMet = item.check(password);

                    return (
                        <p
                            className={`text-sm ${isMet ? "text-emerald-700" : "text-zinc-500"}`}
                            key={item.label}
                        >
                            {isMet ? "•" : "○"} {item.label}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}
