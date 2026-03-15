import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyAqarSummary extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    teachingScore: number;
    researchScore: number;
    publicationScore: number;
    administrativeScore: number;
    extensionScore: number;
    awardScore: number;
    apiTotalScore: number;
    performanceGrade?: string;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyAqarSummarySchema = new Schema<IFacultyAqarSummary>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        teachingScore: { type: Number, min: 0, default: 0 },
        researchScore: { type: Number, min: 0, default: 0 },
        publicationScore: { type: Number, min: 0, default: 0 },
        administrativeScore: { type: Number, min: 0, default: 0 },
        extensionScore: { type: Number, min: 0, default: 0 },
        awardScore: { type: Number, min: 0, default: 0 },
        apiTotalScore: { type: Number, min: 0, default: 0 },
        performanceGrade: { type: String, trim: true },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
        verifiedAt: { type: Date },
    },
    { timestamps: true, collection: "faculty_aqar_summary" }
);

FacultyAqarSummarySchema.index({ facultyId: 1, academicYearId: 1 }, { unique: true });

const FacultyAqarSummary: Model<IFacultyAqarSummary> =
    mongoose.models.FacultyAqarSummary ||
    mongoose.model<IFacultyAqarSummary>("FacultyAqarSummary", FacultyAqarSummarySchema);

export default FacultyAqarSummary;
