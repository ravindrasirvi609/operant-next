import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyPhdGuidanceStatus = "ongoing" | "completed";

export interface IFacultyPhdGuidance extends Document {
    facultyId: Types.ObjectId;
    scholarName: string;
    universityName: string;
    registrationYear: number;
    thesisTitle: string;
    status: FacultyPhdGuidanceStatus;
    completionYear?: number;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyPhdGuidanceSchema = new Schema<IFacultyPhdGuidance>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        scholarName: { type: String, required: true, trim: true },
        universityName: { type: String, required: true, trim: true },
        registrationYear: { type: Number, required: true, index: true },
        thesisTitle: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ["ongoing", "completed"],
            required: true,
            default: "ongoing",
            index: true,
        },
        completionYear: { type: Number, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_phd_guidance" }
);

FacultyPhdGuidanceSchema.index({ facultyId: 1, status: 1 });

const FacultyPhdGuidance: Model<IFacultyPhdGuidance> =
    mongoose.models.FacultyPhdGuidance ||
    mongoose.model<IFacultyPhdGuidance>("FacultyPhdGuidance", FacultyPhdGuidanceSchema);

export default FacultyPhdGuidance;

