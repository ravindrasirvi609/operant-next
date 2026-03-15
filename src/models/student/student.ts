import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudent extends Document {
    userId?: Types.ObjectId;
    enrollmentNo: string;
    firstName: string;
    lastName?: string;
    gender?: "Male" | "Female" | "Other";
    dob?: Date;
    email?: string;
    mobile?: string;
    address?: string;
    institutionId?: Types.ObjectId;
    departmentId: Types.ObjectId;
    programId: Types.ObjectId;
    admissionYear: number;
    status: "Active" | "Graduated" | "Dropped" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        enrollmentNo: { type: String, required: true, trim: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, trim: true },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        dob: { type: Date },
        email: { type: String, trim: true, lowercase: true },
        mobile: { type: String, trim: true },
        address: { type: String, trim: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        admissionYear: { type: Number, required: true, min: 1900, index: true },
        status: {
            type: String,
            required: true,
            enum: ["Active", "Graduated", "Dropped", "Inactive"],
            default: "Active",
            index: true,
        },
    },
    { timestamps: true, collection: "students" }
);

StudentSchema.index({ enrollmentNo: 1 }, { unique: true });
StudentSchema.index({ userId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ departmentId: 1, programId: 1, status: 1 });

const Student: Model<IStudent> =
    mongoose.models.Student ||
    mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
