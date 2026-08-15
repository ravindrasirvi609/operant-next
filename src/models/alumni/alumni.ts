import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const alumniStatusValues = ["Active", "Inactive"] as const;
export type AlumniStatus = (typeof alumniStatusValues)[number];

export interface IAlumni extends Document {
    userId?: Types.ObjectId;
    sourceStudentId: Types.ObjectId;
    enrollmentNo: string;
    firstName: string;
    lastName?: string;
    gender?: "Male" | "Female" | "Other";
    dob?: Date;
    email?: string;
    mobile?: string;
    institutionId?: Types.ObjectId;
    departmentId: Types.ObjectId;
    programId: Types.ObjectId;
    graduationYear: number;
    currentEmployer?: string;
    currentDesignation?: string;
    status: AlumniStatus;
    createdAt: Date;
    updatedAt: Date;
}

const AlumniSchema = new Schema<IAlumni>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        sourceStudentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        enrollmentNo: { type: String, required: true, trim: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, trim: true },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        dob: { type: Date },
        email: { type: String, trim: true, lowercase: true },
        mobile: { type: String, trim: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        graduationYear: { type: Number, required: true, min: 1900, index: true },
        currentEmployer: { type: String, trim: true },
        currentDesignation: { type: String, trim: true },
        status: {
            type: String,
            required: true,
            enum: alumniStatusValues,
            default: "Active",
            index: true,
        },
    },
    { timestamps: true, collection: "alumni" }
);

AlumniSchema.index({ enrollmentNo: 1 }, { unique: true });
AlumniSchema.index({ sourceStudentId: 1 }, { unique: true });
AlumniSchema.index({ userId: 1 }, { unique: true, sparse: true });

const Alumni: Model<IAlumni> =
    mongoose.models.Alumni || mongoose.model<IAlumni>("Alumni", AlumniSchema);

export default Alumni;
