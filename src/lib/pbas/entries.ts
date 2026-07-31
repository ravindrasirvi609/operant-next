import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { createAuditLog } from "@/lib/audit/service";
import { type SafeActor } from "@/lib/workflow/shared";
import { ensurePbasDynamicMigration, syncPbasTotalEntries } from "@/lib/pbas/migration";
import { getPbasApplicationById, canReviewPbasApplication } from "@/lib/pbas/lifecycle";
import { pbasEntryModerationSchema } from "@/lib/pbas/validators";
import FacultyPbasEntry from "@/models/core/faculty-pbas-entry";
import PbasIndicatorMaster from "@/models/core/pbas-indicator-master";
import DocumentModel from "@/models/reference/document";

export async function getPbasEntriesForForm(actor: SafeActor, id: string) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const application = await getPbasApplicationById(actor, id);
    const revisionId =
        !["Draft", "Rejected"].includes(application.status) && application.activeRevisionId
            ? application.activeRevisionId
            : undefined;
    const indicators = await PbasIndicatorMaster.find({})
        .populate("categoryId", "categoryCode categoryName maxScore")
        .sort({ indicatorCode: 1 })
        .lean();

    const entries = await FacultyPbasEntry.find(
        revisionId
            ? { pbasFormId: application._id, pbasRevisionId: revisionId }
            : { pbasFormId: application._id, pbasRevisionId: { $exists: false } }
    )
        .populate("evidenceDocumentId", "fileName fileUrl fileType")
        .lean();

    const entryByIndicator = new Map<string, typeof entries[number]>();
    for (const entry of entries) {
        entryByIndicator.set(entry.indicatorId.toString(), entry);
    }

    const items = indicators.map((indicator) => {
        const entry = entryByIndicator.get(indicator._id.toString());
        return {
            indicatorId: indicator._id.toString(),
            indicatorCode: indicator.indicatorCode,
            indicatorName: indicator.indicatorName,
            category: indicator.categoryId
                ? {
                    id: (indicator.categoryId as { _id?: Types.ObjectId })._id?.toString?.(),
                    code: (indicator.categoryId as { categoryCode?: string }).categoryCode,
                    name: (indicator.categoryId as { categoryName?: string }).categoryName,
                    maxScore: (indicator.categoryId as { maxScore?: number }).maxScore,
                }
                : undefined,
            maxScore: indicator.maxScore,
            claimedScore: entry?.claimedScore ?? 0,
            approvedScore: entry?.approvedScore,
            evidenceDocument: entry?.evidenceDocumentId || null,
            remarks: entry?.remarks,
        };
    });

    return {
        applicationId: application._id.toString(),
        revisionId: revisionId?.toString(),
        status: application.status,
        submissionStatus: application.submissionStatus,
        items,
    };
}

export async function upsertPbasEntryForForm(
    actor: SafeActor,
    id: string,
    input: { indicatorId: string; claimedScore?: number; evidenceDocumentId?: string; remarks?: string }
) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const application = await getPbasApplicationById(actor, id);

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("PBAS entries can only be updated in Draft or Rejected status.", 409);
    }

    const indicator = await PbasIndicatorMaster.findById(input.indicatorId).select("_id indicatorCode maxScore");
    if (!indicator) {
        throw new AuthError("PBAS indicator not found.", 404);
    }

    const existing = await FacultyPbasEntry.findOne({
        pbasFormId: application._id,
        pbasRevisionId: { $exists: false },
        indicatorId: indicator._id,
    });

    const claimedScore =
        typeof input.claimedScore === "number"
            ? input.claimedScore
            : existing?.claimedScore ?? 0;

    if (!Number.isFinite(claimedScore) || claimedScore < 0) {
        throw new AuthError("Claimed score must be a non-negative number.", 400);
    }

    if (claimedScore > indicator.maxScore) {
        throw new AuthError(
            `Claimed score cannot exceed indicator maximum of ${indicator.maxScore}.`,
            400
        );
    }

    let evidenceDocumentId: Types.ObjectId | undefined = existing?.evidenceDocumentId;
    if (input.evidenceDocumentId !== undefined) {
        if (!Types.ObjectId.isValid(input.evidenceDocumentId)) {
            throw new AuthError("Invalid evidence document id.", 400);
        }

        const evidenceDocument = await DocumentModel.findById(input.evidenceDocumentId)
            .select("_id uploadedBy")
            .lean();

        if (!evidenceDocument) {
            throw new AuthError("Evidence document not found.", 404);
        }

        if (!evidenceDocument.uploadedBy || evidenceDocument.uploadedBy.toString() !== actor.id) {
            throw new AuthError("You can only attach evidence documents uploaded by your account.", 403);
        }

        const conflict = await FacultyPbasEntry.findOne({
            evidenceDocumentId: new Types.ObjectId(input.evidenceDocumentId),
            $or: [
                { facultyId: { $ne: application.facultyId } },
                { academicYearId: { $ne: application.academicYearId } },
            ],
        })
            .select("_id")
            .lean();

        if (conflict) {
            throw new AuthError(
                "This evidence document is already linked to another faculty or academic-year PBAS record.",
                409
            );
        }

        evidenceDocumentId = new Types.ObjectId(input.evidenceDocumentId);
    }

    await FacultyPbasEntry.updateOne(
        { pbasFormId: application._id, indicatorId: indicator._id },
        {
            $set: {
                pbasFormId: application._id,
                indicatorId: indicator._id,
                facultyId: application.facultyId,
                academicYearId: application.academicYearId,
                claimedScore,
                evidenceDocumentId,
                remarks: input.remarks ?? existing?.remarks,
            },
            $unset: {
                pbasRevisionId: 1,
            },
        },
        { upsert: true }
    );

    await syncPbasTotalEntries(application._id.toString());

    return getPbasEntriesForForm(actor, application._id.toString());
}

export async function moderatePbasEntriesForForm(actor: SafeActor, id: string, rawInput: unknown) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const input = pbasEntryModerationSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);
    const canReview = await canReviewPbasApplication(application, actor);

    if (!canReview) {
        throw new AuthError("You are not authorized to moderate PBAS indicator scores.", 403);
    }

    if (!["Submitted", "Under Review", "Committee Review"].includes(application.status)) {
        throw new AuthError("Indicator moderation is allowed only during PBAS review stages.", 409);
    }

    const revisionId = application.activeRevisionId || application.latestSubmittedRevisionId;

    if (!revisionId) {
        throw new AuthError("No active PBAS revision found for moderation.", 409);
    }

    const indicatorIds = Array.from(new Set(input.updates.map((item) => item.indicatorId)));
    if (indicatorIds.some((itemId) => !Types.ObjectId.isValid(itemId))) {
        throw new AuthError("One or more indicator ids are invalid.", 400);
    }

    const indicators = await PbasIndicatorMaster.find({
        _id: { $in: indicatorIds.map((entry) => new Types.ObjectId(entry)) },
    })
        .select("_id maxScore")
        .lean();
    const indicatorById = new Map(indicators.map((item) => [item._id.toString(), item]));

    if (indicatorById.size !== indicatorIds.length) {
        throw new AuthError("One or more PBAS indicators were not found.", 404);
    }

    await Promise.all(
        input.updates.map(async (item) => {
            const indicator = indicatorById.get(item.indicatorId);
            if (!indicator) {
                throw new AuthError("PBAS indicator not found.", 404);
            }

            const existing = await FacultyPbasEntry.findOne({
                pbasFormId: application._id,
                pbasRevisionId: revisionId,
                indicatorId: new Types.ObjectId(item.indicatorId),
            })
                .select("claimedScore remarks")
                .lean();

            const claimedScore = existing?.claimedScore ?? 0;
            if (item.approvedScore > indicator.maxScore) {
                throw new AuthError(
                    `Approved score cannot exceed indicator maximum of ${indicator.maxScore}.`,
                    400
                );
            }

            if (item.approvedScore > claimedScore) {
                throw new AuthError("Approved score cannot exceed claimed score.", 400);
            }

            await FacultyPbasEntry.updateOne(
                {
                    pbasFormId: application._id,
                    pbasRevisionId: revisionId,
                    indicatorId: new Types.ObjectId(item.indicatorId),
                },
                {
                    $set: {
                        pbasFormId: application._id,
                        pbasRevisionId: revisionId,
                        indicatorId: new Types.ObjectId(item.indicatorId),
                        facultyId: application.facultyId,
                        academicYearId: application.academicYearId,
                        claimedScore,
                        approvedScore: item.approvedScore,
                        remarks: item.remarks ?? existing?.remarks,
                    },
                },
                { upsert: true }
            );
        })
    );

    await createAuditLog({
        actor,
        action: "PBAS_ENTRY_MODERATE",
        tableName: "faculty_pbas_entries",
        recordId: application._id.toString(),
        auditContext: actor?.auditContext,
        newData: {
            revisionId: revisionId.toString(),
            updates: input.updates.length,
        },
    });

    return getPbasEntriesForForm(actor, application._id.toString());
}
