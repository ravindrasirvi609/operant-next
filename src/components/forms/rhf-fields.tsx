"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { InlineUpload } from "@/components/ui/file-upload";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseIsoDate, toIsoDateString } from "@/lib/ui/dates";

/**
 * react-hook-form field wrappers over the shadcn `Form` primitives.
 *
 * The Form primitives in components/ui/form.tsx were installed but never used by
 * the accreditation modules, which instead grew two worse conventions:
 *
 *   - AQAR's local `FieldShell` rendered `<Label>{label}</Label>` with **no
 *     `htmlFor`**, so no label was ever associated with its input, and pulled
 *     the error string out by hand with a `getValueAtPath` walker.
 *   - The CAS steps used bare `<Input placeholder="Journal" />` with **no label
 *     and no error message at all** — a validation failure there was invisible.
 *
 * Going through `FormField`/`FormItem`/`FormControl` wires `htmlFor`,
 * `aria-invalid`, and `aria-describedby` from one `useId`, and `FormMessage`
 * renders the zod message automatically. These components read the form from
 * `FormProvider` context, so every consumer must wrap its tree in `<Form
 * {...form}>` — which also removes the `form` prop that used to be threaded
 * through every step component.
 */

/** How wide a field sits in the shared 1 / 2 / 3-column responsive field grid. */
export type FieldSpan = 1 | 2 | "full";

const SPAN_CLASS: Record<string, string> = {
    "1": "",
    "2": "sm:col-span-2",
    full: "col-span-full",
};

/**
 * The one field grid. Single column on phones, two from `sm`, three from `xl`.
 *
 * Replaces `md:grid-cols-2 xl:grid-cols-4` (AQAR — four columns of a 13-field
 * entry meant ~90px per input on a 1280px laptop) and `md:grid-cols-2
 * xl:grid-cols-5` (CAS publications). Neither had a single-column phone case, so
 * both overflowed horizontally below 768px.
 */
export function FieldGrid({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
            {...props}
        />
    );
}

type BaseFieldProps = {
    name: string;
    label: string;
    description?: string;
    placeholder?: string;
    disabled?: boolean;
    span?: FieldSpan;
    className?: string;
};

function spanClass(span?: FieldSpan) {
    return span ? SPAN_CLASS[String(span)] : undefined;
}

export function RhfTextField({
    name,
    label,
    description,
    placeholder,
    disabled,
    span,
    className,
    type = "text",
}: BaseFieldProps & { type?: React.ComponentProps<typeof Input>["type"] }) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input
                            type={type}
                            placeholder={placeholder}
                            disabled={disabled}
                            {...field}
                            value={field.value ?? ""}
                        />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/**
 * Numeric input that hands the form a `number`, not a string.
 *
 * The originals passed `registerOptions={{ valueAsNumber: true }}`, which turns
 * an empty input into `NaN` and makes `z.coerce.number()` report "Expected
 * number, received nan". Empty here becomes `undefined`, which optional schemas
 * accept and required ones reject with their own message.
 */
export function RhfNumberField({
    name,
    label,
    description,
    placeholder,
    disabled,
    span,
    className,
    min,
    max,
    step,
}: BaseFieldProps & { min?: number; max?: number; step?: number }) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={min}
                            max={max}
                            step={step}
                            placeholder={placeholder}
                            disabled={disabled}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={field.value ?? ""}
                            onChange={(event) => {
                                const raw = event.target.value;
                                field.onChange(raw === "" ? undefined : Number(raw));
                            }}
                        />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export function RhfTextareaField({
    name,
    label,
    description,
    placeholder,
    disabled,
    span = "full",
    className,
    rows = 4,
}: BaseFieldProps & { rows?: number }) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Textarea
                            rows={rows}
                            placeholder={placeholder}
                            disabled={disabled}
                            {...field}
                            value={field.value ?? ""}
                        />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export type SelectFieldOption = { label: string; value: string };

export function RhfSelectField({
    name,
    label,
    description,
    placeholder = "Select an option",
    disabled,
    span,
    className,
    options,
    onValueChange,
}: BaseFieldProps & {
    options: SelectFieldOption[];
    /** Side effects such as deriving a dependent field from the choice. */
    onValueChange?: (value: string) => void;
}) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        value={field.value ? String(field.value) : ""}
                        disabled={disabled}
                        onValueChange={(value) => {
                            field.onChange(value);
                            onValueChange?.(value);
                        }}
                    >
                        <FormControl>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.length ? (
                                options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            ) : (
                                // Radix renders an empty, un-dismissable popover
                                // otherwise; a disabled row explains the state.
                                <SelectItem value="__empty" disabled>
                                    No options available
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/** Calendar-backed field storing a `yyyy-MM-dd` string, as the schemas expect. */
export function RhfDateField({
    name,
    label,
    description,
    placeholder = "Pick a date",
    disabled,
    span,
    className,
}: BaseFieldProps) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <DatePicker
                            value={parseIsoDate(field.value as string | undefined)}
                            onValueChange={(date) => field.onChange(toIsoDateString(date))}
                            placeholder={placeholder}
                            disabled={disabled}
                        />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/** Evidence upload storing the resulting file URL as a string. */
export function RhfUploadField({
    name,
    label,
    description,
    placeholder = "Upload proof",
    disabled,
    span,
    className,
    ownerId,
}: BaseFieldProps & { ownerId: string }) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem className={cn("min-w-0", spanClass(span), className)}>
                    <FormLabel>{label}</FormLabel>
                    <InlineUpload
                        category="evidence"
                        ownerId={ownerId}
                        mode="url"
                        placeholder={placeholder}
                        disabled={disabled}
                        value={typeof field.value === "string" && field.value ? field.value : null}
                        onChange={(next) =>
                            field.onChange(
                                typeof next === "string"
                                    ? next
                                    : (next as { fileUrl?: string } | null)?.fileUrl ?? ""
                            )
                        }
                    />
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export function RhfCheckboxField({
    name,
    label,
    description,
    disabled,
    span = "full",
    className,
}: BaseFieldProps) {
    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem
                    className={cn(
                        "flex flex-row items-start gap-3 rounded-lg border p-3",
                        spanClass(span),
                        className
                    )}
                >
                    <FormControl>
                        <Checkbox
                            checked={Boolean(field.value)}
                            disabled={disabled}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                    </FormControl>
                    <div className="min-w-0 space-y-1">
                        <FormLabel className="leading-snug font-normal">{label}</FormLabel>
                        {description ? <FormDescription>{description}</FormDescription> : null}
                        <FormMessage />
                    </div>
                </FormItem>
            )}
        />
    );
}
