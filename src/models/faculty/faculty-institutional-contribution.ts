import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyImpactLevel = "dept" | "institute" | "university";

export interface IFacultyInstitutionalContribution extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    activityTitle: string;
    role: string;
    impactLevel: FacultyImpactLevel;
    scoreWeightage: number;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyInstitutionalContributionSchema = new Schema<IFacultyInstitutionalContribution>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        activityTitle: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        impactLevel: {
            type: String,
            enum: ["dept", "institute", "university"],
            required: true,
            index: true,
        },
        scoreWeightage: { type: Number, default: 0 },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_institutional_contribution" }
);

FacultyInstitutionalContributionSchema.index({ facultyId: 1, academicYearId: 1 });

const FacultyInstitutionalContribution: Model<IFacultyInstitutionalContribution> =
    mongoose.models.FacultyInstitutionalContribution ||
    mongoose.model<IFacultyInstitutionalContribution>(
        "FacultyInstitutionalContribution",
        FacultyInstitutionalContributionSchema
    );

export default FacultyInstitutionalContribution;

