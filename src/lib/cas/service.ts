import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import CasApplication, { type CasStatus } from "@/models/core/cas-application";
import { casApplicationSchema, casApprovalSchema, casReviewSchema } from "@/lib/cas/validators";
import { getPbasReportsByIdsForFaculty } from "@/lib/pbas/service";
import { syncEvidenceFromCas } from "@/lib/faculty-evidence/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

function scorePublication(indexing?: string) {
    const value = (indexing ?? "").toLowerCase();

    if (value.includes("scopus") || value.includes("ugc care") || value.includes("web of science")) {
        return 12;
    }

    if (value.includes("peer")) {
        return 8;
    }

    return 5;
}

export async function computeCasApiScore(
    facultyId: string,
    input: ReturnType<typeof casApplicationSchema.parse>
) {
    const selectedPbas = await getPbasReportsByIdsForFaculty(facultyId, input.pbasReports);

    const teachingLearning = Math.min(
        100,
        selectedPbas.reduce((sum, entry) => sum + Number(entry.apiScore?.teachingActivities ?? 0), 0)
    );

    const publicationScore = input.achievements.publications.reduce(
        (sum, publication) => sum + scorePublication(publication.indexing),
        0
    );
    const booksScore = input.achievements.books.length * 15;
    const projectScore = input.achievements.researchProjects.reduce((sum, project) => {
        if (project.amount >= 1000000) return sum + 12;
        if (project.amount >= 250000) return sum + 8;
        return sum + 5;
    }, 0);
    const phdScore = input.achievements.phdGuided * 12;
    const conferenceScore = input.achievements.conferences * 4;

    const researchPublication = Math.min(
        150,
        publicationScore + booksScore + projectScore + phdScore + conferenceScore
    );

    const academicContribution = Math.min(
        100,
        selectedPbas.reduce(
            (sum, entry) => sum + Number(entry.apiScore?.institutionalResponsibilities ?? 0),
            0
        ) + Math.min(input.achievements.conferences * 2, 20)
    );

    return {
        teachingLearning,
        researchPublication,
        academicContribution,
        totalScore: teachingLearning + researchPublication + academicContribution,
    };
}

export function evaluateCasEligibility(input: ReturnType<typeof casApplicationSchema.parse>, apiTotalScore: number) {
    const from = input.currentDesignation.toLowerCase();
    const to = input.applyingForDesignation.toLowerCase();

    const rules = [
        {
            match: from.includes("stage 1") && to.includes("stage 2"),
            minExperience: 4,
            minApi: 120,
            message: "Stage 1 to Stage 2 requires at least 4 years of experience and a minimum API score of 120.",
        },
        {
            match: from.includes("stage 2") && to.includes("stage 3"),
            minExperience: 5,
            minApi: 140,
            message: "Stage 2 to Stage 3 requires at least 5 years of experience and a minimum API score of 140.",
        },
        {
            match:
                (from.includes("stage 3") && (to.includes("stage 4") || to.includes("associate professor"))) ||
                (from.includes("assistant professor") && to.includes("associate professor")),
            minExperience: 3,
            minApi: 180,
            message: "Stage 3 to Associate Professor requires at least 3 years of experience and a strong API score.",
        },
        {
            match: from.includes("associate professor") && to.includes("professor"),
            minExperience: 3,
            minApi: 220,
            message: "Associate Professor to Professor requires at least 3 years of experience and a high research output.",
        },
    ];

    const matchedRule = rules.find((rule) => rule.match);

    if (!matchedRule) {
        return {
            isEligible: false,
            message: "This CAS promotion path is not configured in the system.",
            minimumExperienceYears: undefined,
            minimumApiScore: undefined,
        };
    }

    const isEligible =
        input.experienceYears >= matchedRule.minExperience && apiTotalScore >= matchedRule.minApi;

    return {
        isEligible,
        message: isEligible
            ? `Eligible for ${input.applyingForDesignation}.`
            : matchedRule.message,
        minimumExperienceYears: matchedRule.minExperience,
        minimumApiScore: matchedRule.minApi,
    };
}

async function getDepartmentHeadedByUser(userId: string) {
    return Organization.findOne({
        type: "Department",
        headUserId: userId,
        isActive: true,
    }).select("name");
}

function pushStatusLog(
    application: InstanceType<typeof CasApplication>,
    status: CasStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push({
        status,
        actorId: actor ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

async function getUserForApplication(application: InstanceType<typeof CasApplication>) {
    const faculty = await User.findById(application.facultyId).select(
        "name email role department designation universityName collegeName"
    );

    if (!faculty) {
        throw new AuthError("Faculty account not found.", 404);
    }

    return faculty;
}

export async function createCasApplication(actor: SafeActor, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create CAS applications.", 403);
    }

    await dbConnect();
    const apiScore = await computeCasApiScore(actor.id, input);
    const eligibility = evaluateCasEligibility(input, apiScore.totalScore);

    const application = await CasApplication.create({
        facultyId: new Types.ObjectId(actor.id),
        applicationYear: input.applicationYear,
        currentDesignation: input.currentDesignation,
        applyingForDesignation: input.applyingForDesignation,
        eligibilityPeriod: input.eligibilityPeriod,
        experienceYears: input.experienceYears,
        pbasReports: input.pbasReports.map((id) => new Types.ObjectId(id)),
        apiScore,
        achievements: input.achievements,
        eligibility,
        reviewCommittee: [],
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "CAS application draft created.",
                changedAt: new Date(),
            },
        ],
        status: "Draft",
    });

    await syncEvidenceFromCas(actor.id, input);

    return application;
}

export async function getFacultyCasApplications(actor: SafeActor) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their CAS applications.", 403);
    }

    return CasApplication.find({ facultyId: actor.id }).sort({ updatedAt: -1 });
}

export async function getCasApplicationById(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await CasApplication.findById(id);

    if (!application) {
        throw new AuthError("CAS application not found.", 404);
    }

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty" && application.facultyId.toString() === actor.id) {
        return application;
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (headedDepartment) {
        const faculty = await getUserForApplication(application);
        if (faculty.department === headedDepartment.name) {
            return application;
        }
    }

    throw new AuthError("You do not have access to this CAS application.", 403);
}

export async function updateCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    const application = await getCasApplicationById(actor, id);

    if (actor.role !== "Faculty" || application.facultyId.toString() !== actor.id) {
        throw new AuthError("Only the faculty owner can update this CAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected CAS applications can be edited.", 409);
    }

    const apiScore = await computeCasApiScore(actor.id, input);
    const eligibility = evaluateCasEligibility(input, apiScore.totalScore);

    application.applicationYear = input.applicationYear;
    application.currentDesignation = input.currentDesignation;
    application.applyingForDesignation = input.applyingForDesignation;
    application.eligibilityPeriod = input.eligibilityPeriod;
    application.experienceYears = input.experienceYears;
    application.pbasReports = input.pbasReports.map((entry) => new Types.ObjectId(entry));
    application.apiScore = apiScore;
    application.achievements = input.achievements;
    application.eligibility = eligibility;

    pushStatusLog(application, application.status, actor, "CAS application draft auto-saved.");
    await application.save();
    await syncEvidenceFromCas(actor.id, input);

    return application;
}

export async function submitCasApplication(actor: SafeActor, id: string) {
    const application = await getCasApplicationById(actor, id);

    if (actor.role !== "Faculty" || application.facultyId.toString() !== actor.id) {
        throw new AuthError("Only the faculty owner can submit this CAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected applications can be submitted.", 409);
    }

    if (!application.eligibility.isEligible) {
        throw new AuthError(application.eligibility.message || "CAS eligibility requirements are not satisfied.", 400);
    }

    if (!application.pbasReports.length) {
        throw new AuthError("At least one PBAS report must be linked before submission.", 400);
    }

    application.status = "Submitted";
    application.submittedAt = new Date();
    pushStatusLog(application, "Submitted", actor, "Faculty submitted CAS application.");
    await application.save();

    return application;
}

export async function reviewCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casReviewSchema.parse(rawInput);
    const application = await getCasApplicationById(actor, id);

    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    if (!isDepartmentHead && !isCommitteeReviewer) {
        throw new AuthError("You are not authorized to review this CAS application.", 403);
    }

    if (input.decision === "Reject") {
        application.status = "Rejected";
        application.reviewCommittee.push({
            reviewerId: new Types.ObjectId(actor.id),
            reviewerName: actor.name,
            reviewerRole: actor.role,
            designation: actor.role === "Admin" ? "Admin Reviewer" : "Department Head",
            remarks: input.remarks,
            decision: input.decision,
            stage: isDepartmentHead ? "Department Head" : "CAS Committee",
            reviewedAt: new Date(),
        });
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();
        return application;
    }

    const nextStatus: CasStatus =
        application.status === "Submitted"
            ? "Under Review"
            : "Committee Review";

    application.status = nextStatus;
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation:
            application.status === "Under Review"
                ? "Department Head Reviewer"
                : "CAS Committee Reviewer",
        remarks: input.remarks,
        decision: input.decision,
        stage: nextStatus === "Under Review" ? "Department Head" : "CAS Committee",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();

    return application;
}

export async function approveCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize CAS approval.", 403);
    }

    const application = await getCasApplicationById(actor, id);

    application.status = input.decision === "Approve" ? "Approved" : "Rejected";
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation: "Admin Final Approver",
        remarks: input.remarks,
        decision: input.decision,
        stage: "Admin",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, application.status, actor, input.remarks);
    await application.save();

    return application;
}

export async function getCasReviewQueue(actor: SafeActor) {
    await dbConnect();

    if (actor.role === "Admin") {
        return CasApplication.find({
            status: { $in: ["Under Review", "Committee Review", "Submitted"] },
        }).sort({ updatedAt: -1 });
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (!headedDepartment) {
        return [];
    }

    const facultyUsers = await User.find({ department: headedDepartment.name, role: "Faculty" }).select("_id");

    return CasApplication.find({
        facultyId: { $in: facultyUsers.map((item) => item._id) },
        status: { $in: ["Submitted", "Under Review"] },
    }).sort({ updatedAt: -1 });
}
