"use client";

import * as React from "react";

import {
    RhfCheckboxField,
    RhfDateField,
    RhfNumberField,
    RhfSelectField,
    RhfTextField,
    RhfTextareaField,
    RhfUploadField,
    type FieldSpan,
    type SelectFieldOption,
} from "@/components/forms/rhf-fields";

/**
 * A form field described as data rather than JSX.
 *
 * This is what lets the twelve AQAR contribution editors and the three CAS
 * achievement editors become configuration instead of ~1,400 lines of
 * near-identical markup. Each of those blocks was a hand-written list of
 * `<TextField form={form} name={`facultyContribution.researchPapers.${index}.issnNumber`}
 * label="ISSN number" disabled={!editable} />` — the same four props repeated
 * with a different string, and the array path re-interpolated on every line.
 *
 * With a descriptor, `name` is *relative to the entry* ("issnNumber") and the
 * array path is applied once by the renderer, so the path can no longer drift
 * between sibling fields.
 */

type CommonDescriptor = {
    /** Field key relative to its containing object, e.g. "issnNumber". */
    name: string;
    label: string;
    placeholder?: string;
    description?: string;
    span?: FieldSpan;
};

export type FieldDescriptor =
    | (CommonDescriptor & { kind: "text" })
    | (CommonDescriptor & { kind: "textarea"; rows?: number })
    | (CommonDescriptor & { kind: "number"; min?: number; max?: number; step?: number })
    | (CommonDescriptor & { kind: "date" })
    | (CommonDescriptor & { kind: "upload" })
    | (CommonDescriptor & { kind: "checkbox" })
    | (CommonDescriptor & { kind: "select"; options: SelectFieldOption[] });

export type DescriptorContext = {
    /** Prefix applied to every `name`, e.g. "facultyContribution.patents.2." */
    prefix?: string;
    disabled?: boolean;
    /** Required when any descriptor has `kind: "upload"`. */
    ownerId?: string;
};

export function descriptorPath(descriptor: FieldDescriptor, prefix?: string) {
    return prefix ? `${prefix}${descriptor.name}` : descriptor.name;
}

/** Renders one descriptor. Exhaustive over `kind` — a new kind is a type error. */
export function DescriptorField({
    descriptor,
    prefix,
    disabled,
    ownerId,
}: DescriptorContext & { descriptor: FieldDescriptor }) {
    const name = descriptorPath(descriptor, prefix);
    const shared = {
        name,
        label: descriptor.label,
        placeholder: descriptor.placeholder,
        description: descriptor.description,
        span: descriptor.span,
        disabled,
    };

    switch (descriptor.kind) {
        case "text":
            return <RhfTextField {...shared} />;
        case "textarea":
            return <RhfTextareaField {...shared} rows={descriptor.rows} />;
        case "number":
            return (
                <RhfNumberField
                    {...shared}
                    min={descriptor.min}
                    max={descriptor.max}
                    step={descriptor.step}
                />
            );
        case "date":
            return <RhfDateField {...shared} />;
        case "checkbox":
            return <RhfCheckboxField {...shared} />;
        case "select":
            return <RhfSelectField {...shared} options={descriptor.options} />;
        case "upload":
            // An upload with no owner would post evidence to an empty scope, so
            // this is a hard configuration error rather than a silent no-op.
            if (!ownerId) {
                throw new Error(
                    `Field "${name}" has kind "upload" but no ownerId was supplied to DescriptorField.`
                );
            }

            return <RhfUploadField {...shared} ownerId={ownerId} />;
    }
}

/** Renders a descriptor list into the shared responsive field grid. */
export function DescriptorFields({
    fields,
    prefix,
    disabled,
    ownerId,
}: DescriptorContext & { fields: FieldDescriptor[] }) {
    return (
        <>
            {fields.map((descriptor) => (
                <DescriptorField
                    key={descriptorPath(descriptor, prefix)}
                    descriptor={descriptor}
                    prefix={prefix}
                    disabled={disabled}
                    ownerId={ownerId}
                />
            ))}
        </>
    );
}

/** Every field path a descriptor list contributes, for step-level error checks. */
export function descriptorPaths(fields: FieldDescriptor[], prefix?: string): string[] {
    return fields.map((descriptor) => descriptorPath(descriptor, prefix));
}
