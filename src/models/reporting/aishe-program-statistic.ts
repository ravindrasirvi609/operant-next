import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheProgramStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    programId: Types.ObjectId;
    intakeCapacity: number;
    studentsEnrolled: number;
    studentsPassed: number;
    studentsPlaced: number;
    studentsHigherStudies: number;
    dropoutCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheProgramStatisticSchema = new Schema<IAisheProgramStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        intakeCapacity: { type: Number, min: 0, default: 0 },
        studentsEnrolled: { type: Number, min: 0, default: 0 },
        studentsPassed: { type: Number, min: 0, default: 0 },
        studentsPlaced: { type: Number, min: 0, default: 0 },
        studentsHigherStudies: { type: Number, min: 0, default: 0 },
        dropoutCount: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_program_statistics" }
);

AisheProgramStatisticSchema.index({ surveyCycleId: 1, programId: 1 }, { unique: true });

const AisheProgramStatistic: Model<IAisheProgramStatistic> =
    mongoose.models.AisheProgramStatistic ||
    mongoose.model<IAisheProgramStatistic>("AisheProgramStatistic", AisheProgramStatisticSchema);

export default AisheProgramStatistic;
