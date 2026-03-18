import mongoose, { Document, Model, Schema, Types } from "mongoose";

import {
    PbasApiScoreSchema,
    PbasSnapshotDocumentSchema,
    type IPbasApiScore,
    type IPbasSnapshotDocument,
} from "@/models/core/pbas-snapshot-schema";
import {
    PbasDraftReferencesSchema,
    type IPbasDraftReferences,
} from "@/models/core/pbas-reference-schema";
import type { PbasStatus } from "@/models/core/faculty-pbas-form";

export type PbasRevisionBackfillIntegrity = "exact" | "reconstructed";
export type PbasRevisionMigrationSource = "runtime_submit" | "legacy_snapshot" | "live_references";

export interface IFacultyPbasRevision extends Document {
    pbasFormId: Types.ObjectId;
    revisionNumber: number;
    createdFromStatus: PbasStatus;
    submittedAt: Date;
    submittedBy?: Types.ObjectId;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    migrationSource?: PbasRevisionMigrationSource;
    backfillIntegrity?: PbasRevisionBackfillIntegrity;
    references: IPbasDraftReferences;
    snapshot: IPbasSnapshotDocument;
    apiScore: IPbasApiScore;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyPbasRevisionSchema = new Schema<IFacultyPbasRevision>(
    {
        pbasFormId: { type: Schema.Types.ObjectId, ref: "FacultyPbasForm", required: true, index: true },
        revisionNumber: { type: Number, required: true, min: 1 },
        createdFromStatus: {
            type: String,
            enum: ["Draft", "Submitted", "Under Review", "Committee Review", "Approved", "Rejected"],
            required: true,
        },
        submittedAt: { type: Date, required: true, default: Date.now },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        migrationSource: {
            type: String,
            enum: ["runtime_submit", "legacy_snapshot", "live_references"],
        },
        backfillIntegrity: {
            type: String,
            enum: ["exact", "reconstructed"],
        },
        references: { type: PbasDraftReferencesSchema, required: true },
        snapshot: { type: PbasSnapshotDocumentSchema, required: true },
        apiScore: { type: PbasApiScoreSchema, required: true },
    },
    { timestamps: true, collection: "faculty_pbas_revisions" }
);

FacultyPbasRevisionSchema.index({ pbasFormId: 1, revisionNumber: 1 }, { unique: true });
FacultyPbasRevisionSchema.index({ pbasFormId: 1, submittedAt: -1 });

const FacultyPbasRevision: Model<IFacultyPbasRevision> =
    mongoose.models.FacultyPbasRevision ||
    mongoose.model<IFacultyPbasRevision>("FacultyPbasRevision", FacultyPbasRevisionSchema);

export default FacultyPbasRevision;
