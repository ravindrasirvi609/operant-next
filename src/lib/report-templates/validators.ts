import { z } from "zod";

export const reportTemplateTypeSchema = z.enum([
    "PBAS_APPRAISAL",
    "AQAR_FACULTY",
    "AQAR_CYCLE",
    "FACULTY_CAS",
    "FACULTY_PBAS",
]);

export const reportTemplateSectionSchema = z.object({
    key: z.string().trim().min(1, "Section key is required."),
    title: z.string().trim().min(1, "Section title is required."),
    body: z.string().trim().min(1, "Section body is required."),
    order: z.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
});

export const reportTemplateUpdateSchema = z.object({
    name: z.string().trim().min(2, "Template name is required."),
    description: z.string().trim().optional().or(z.literal("")),
    titleTemplate: z.string().trim().min(1, "Title template is required."),
    subtitleTemplate: z.string().trim().optional().or(z.literal("")),
    metaTemplate: z.string().trim().optional().or(z.literal("")),
    introTemplate: z.string().trim().optional().or(z.literal("")),
    footerTemplate: z.string().trim().optional().or(z.literal("")),
    sections: z.array(reportTemplateSectionSchema).min(1, "At least one section is required."),
});

export type ReportTemplateUpdateInput = z.infer<typeof reportTemplateUpdateSchema>;
