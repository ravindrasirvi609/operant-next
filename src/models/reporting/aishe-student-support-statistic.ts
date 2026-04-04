import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheStudentSupportStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    studentsReceivedScholarship: number;
    studentsReceivedFeeReimbursement: number;
    studentsHostelResidents: number;
    studentsTransportFacility: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheStudentSupportStatisticSchema = new Schema<IAisheStudentSupportStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, unique: true, index: true },
        studentsReceivedScholarship: { type: Number, min: 0, default: 0 },
        studentsReceivedFeeReimbursement: { type: Number, min: 0, default: 0 },
        studentsHostelResidents: { type: Number, min: 0, default: 0 },
        studentsTransportFacility: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_student_support_statistics" }
);

const AisheStudentSupportStatistic: Model<IAisheStudentSupportStatistic> =
    mongoose.models.AisheStudentSupportStatistic ||
    mongoose.model<IAisheStudentSupportStatistic>("AisheStudentSupportStatistic", AisheStudentSupportStatisticSchema);

export default AisheStudentSupportStatistic;
