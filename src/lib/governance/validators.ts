import { z } from "zod";

import {
    leadershipAssignmentTypes,
} from "@/models/core/leadership-assignment";
import {
    governanceCommitteeScopeTypes,
    governanceCommitteeTypes,
} from "@/models/core/governance-committee";
import {
    governanceCommitteeMemberRoles,
} from "@/models/core/governance-committee-membership";

export const leadershipAssignmentSchema = z.object({
    userId: z.string().trim().min(1, "Select a user."),
    organizationId: z.string().trim().min(1, "Select an organization."),
    assignmentType: z.enum(leadershipAssignmentTypes),
    title: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
    notes: z.string().trim().optional(),
});

export const leadershipAssignmentUpdateSchema = leadershipAssignmentSchema.partial();

export const governanceCommitteeSchema = z.object({
    name: z.string().trim().min(2, "Committee name is required."),
    code: z.string().trim().optional(),
    committeeType: z.enum(governanceCommitteeTypes),
    scopeType: z.enum(governanceCommitteeScopeTypes),
    organizationId: z.string().trim().optional(),
    academicYearLabel: z.string().trim().optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const governanceCommitteeUpdateSchema = governanceCommitteeSchema.partial();

const governanceCommitteeMembershipBaseSchema = z.object({
    committeeId: z.string().trim().min(1, "Select a committee."),
    userId: z.string().trim().optional(),
    memberName: z.string().trim().optional(),
    memberEmail: z.string().trim().optional(),
    memberRole: z.enum(governanceCommitteeMemberRoles),
    isExternal: z.boolean().default(false),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    isActive: z.boolean().default(true),
    notes: z.string().trim().optional(),
});

export const governanceCommitteeMembershipSchema = governanceCommitteeMembershipBaseSchema.superRefine((value, ctx) => {
    if (!value.isExternal && !value.userId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Select a user for internal committee memberships.",
            path: ["userId"],
        });
    }

    if (value.isExternal && !value.memberName?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "External committee members require a name.",
            path: ["memberName"],
        });
    }
});

export const governanceCommitteeMembershipUpdateSchema = governanceCommitteeMembershipBaseSchema.partial();
