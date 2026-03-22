import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IDepartment extends Document {
    organizationId?: Types.ObjectId;
    institutionId: Types.ObjectId;
    name: string;
    code?: string;
    hodName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        hodName: { type: String, trim: true },
    },
    { timestamps: true, collection: "departments" }
);

DepartmentSchema.index({ institutionId: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ institutionId: 1, code: 1 }, { unique: true, sparse: true });

const Department: Model<IDepartment> =
    mongoose.models.Department ||
    mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
