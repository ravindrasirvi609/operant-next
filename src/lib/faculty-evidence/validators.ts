import { z } from "zod";

const publicationSchema = z.object({
    title: z.string().trim().min(2, "Publication title is required."),
    journal: z.string().trim().min(2, "Journal name is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    issn: z.string().trim().optional(),
    indexing: z.string().trim().optional(),
});

const bookSchema = z.object({
    title: z.string().trim().min(2, "Book title is required."),
    publisher: z.string().trim().min(2, "Publisher is required."),
    isbn: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
});

const projectSchema = z.object({
    title: z.string().trim().min(2, "Project title is required."),
    fundingAgency: z.string().trim().min(2, "Funding agency is required."),
    amount: z.coerce.number().min(0).optional(),
    year: z.coerce.number().int().min(1900).max(2100),
});

const patentSchema = z.object({
    title: z.string().trim().min(2, "Patent title is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    status: z.string().trim().min(2, "Patent status is required."),
});

const conferenceSchema = z.object({
    title: z.string().trim().min(2, "Conference title is required."),
    organizer: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
    type: z.string().trim().optional(),
});

const workshopSchema = z.object({
    title: z.string().trim().min(2, "Workshop title is required."),
    role: z.string().trim().optional(),
    level: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
});

const extensionSchema = z.object({
    title: z.string().trim().min(2, "Extension activity title is required."),
    roleOrAudience: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
});

const collaborationSchema = z.object({
    organization: z.string().trim().min(2, "Organization is required."),
    purpose: z.string().trim().min(2, "Purpose is required."),
    year: z.coerce.number().int().min(1900).max(2100),
});

export const facultyEvidenceSchema = z.object({
    publications: z.array(publicationSchema).default([]),
    books: z.array(bookSchema).default([]),
    projects: z.array(projectSchema).default([]),
    patents: z.array(patentSchema).default([]),
    conferences: z.array(conferenceSchema).default([]),
    workshops: z.array(workshopSchema).default([]),
    extensionActivities: z.array(extensionSchema).default([]),
    collaborations: z.array(collaborationSchema).default([]),
});

export type FacultyEvidenceInput = z.input<typeof facultyEvidenceSchema>;
