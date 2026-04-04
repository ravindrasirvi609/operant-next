import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheFacultyStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    departmentId: Types.ObjectId;
    totalFaculty: number;
    maleFaculty: number;
    femaleFaculty: number;
    phdFaculty: number;
    pgFaculty: number;
    ugFaculty: number;
    professorsCount: number;
    associateProfessorsCount: number;
    assistantProfessorsCount: number;
    contractFacultyCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheFacultyStatisticSchema = new Schema<IAisheFacultyStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        totalFaculty: { type: Number, min: 0, default: 0 },
        maleFaculty: { type: Number, min: 0, default: 0 },
        femaleFaculty: { type: Number, min: 0, default: 0 },
        phdFaculty: { type: Number, min: 0, default: 0 },
        pgFaculty: { type: Number, min: 0, default: 0 },
        ugFaculty: { type: Number, min: 0, default: 0 },
        professorsCount: { type: Number, min: 0, default: 0 },
        associateProfessorsCount: { type: Number, min: 0, default: 0 },
        assistantProfessorsCount: { type: Number, min: 0, default: 0 },
        contractFacultyCount: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_faculty_statistics" }
);

AisheFacultyStatisticSchema.index({ surveyCycleId: 1, departmentId: 1 }, { unique: true });

const AisheFacultyStatistic: Model<IAisheFacultyStatistic> =
    mongoose.models.AisheFacultyStatistic ||
    mongoose.model<IAisheFacultyStatistic>("AisheFacultyStatistic", AisheFacultyStatisticSchema);

export default AisheFacultyStatistic;
