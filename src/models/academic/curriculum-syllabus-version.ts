import mongoose, { Document, Model, Schema, Types } from "mongoose";

import {
    curriculumWorkflowStatusValues,
    type CurriculumWorkflowStatus,
} from "@/models/academic/curriculum-assignment";

export interface ICurriculumSyllabusVersion extends Document {
    curriculumId: Types.ObjectId;
    curriculumCourseId: Types.ObjectId;
    versionNumber: number;
    revisionReason?: string;
    syllabusSummary?: string;
    unitOutline?: string;
    pedagogy?: string;
    assessmentStrategy?: string;
    referenceBooks: string[];
    officialDocumentId?: Types.ObjectId;
    approvedByBosMeetingId?: Types.ObjectId;
    effectiveAcademicYearId?: Types.ObjectId;
    preparedByUserId?: Types.ObjectId;
    lastEditedByUserId?: Types.ObjectId;
    status: CurriculumWorkflowStatus;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumSyllabusVersionSchema = new Schema<ICurriculumSyllabusVersion>(
    {
        curriculumId: { type: Schema.Types.ObjectId, ref: "CurriculumPlan", required: true, index: true },
        curriculumCourseId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumCourse",
            required: true,
            index: true,
        },
        versionNumber: { type: Number, required: true, min: 1 },
        revisionReason: { type: String, trim: true },
        syllabusSummary: { type: String, trim: true },
        unitOutline: { type: String, trim: true },
        pedagogy: { type: String, trim: true },
        assessmentStrategy: { type: String, trim: true },
        referenceBooks: { type: [String], default: [] },
        officialDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        approvedByBosMeetingId: { type: Schema.Types.ObjectId, ref: "CurriculumBosMeeting" },
        effectiveAcademicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        preparedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
        lastEditedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
        status: {
            type: String,
            enum: curriculumWorkflowStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        submittedAt: { type: Date },
        reviewedAt: { type: Date },
        approvedAt: { type: Date },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "syllabus_versions" }
);

CurriculumSyllabusVersionSchema.index(
    { curriculumCourseId: 1, versionNumber: 1 },
    { unique: true }
);
CurriculumSyllabusVersionSchema.index({ curriculumId: 1, status: 1, updatedAt: -1 });

const CurriculumSyllabusVersion: Model<ICurriculumSyllabusVersion> =
    mongoose.models.CurriculumSyllabusVersion ||
    mongoose.model<ICurriculumSyllabusVersion>(
        "CurriculumSyllabusVersion",
        CurriculumSyllabusVersionSchema
    );

export default CurriculumSyllabusVersion;
