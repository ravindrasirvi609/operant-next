import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfDepartmentContribution extends Document {
    rankingCycleId: Types.ObjectId;
    departmentId: Types.ObjectId;
    parameterCode: string;
    contributionScore: number;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfDepartmentContributionSchema = new Schema<INirfDepartmentContribution>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        parameterCode: { type: String, required: true, trim: true, uppercase: true },
        contributionScore: { type: Number, required: true, default: 0 },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "nirf_department_contribution" }
);

const NirfDepartmentContribution: Model<INirfDepartmentContribution> =
    mongoose.models.NirfDepartmentContribution ||
    mongoose.model<INirfDepartmentContribution>("NirfDepartmentContribution", NirfDepartmentContributionSchema);

export default NirfDepartmentContribution;
