import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyFdpLevel = "College" | "State" | "National" | "International";

export interface IFacultyFdpConducted extends Document {
    facultyId: Types.ObjectId;
    title: string;
    sponsoredBy?: string;
    level: FacultyFdpLevel;
    startDate?: Date;
    endDate?: Date;
    participantsCount?: number;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyFdpConductedSchema = new Schema<IFacultyFdpConducted>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        sponsoredBy: { type: String, trim: true },
        level: {
            type: String,
            required: true,
            enum: ["College", "State", "National", "International"],
            default: "College",
            index: true,
        },
        startDate: { type: Date },
        endDate: { type: Date },
        participantsCount: { type: Number, min: 0 },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_fdp_conducted" }
);

FacultyFdpConductedSchema.index({ facultyId: 1, title: 1, startDate: 1 });

const FacultyFdpConducted: Model<IFacultyFdpConducted> =
    mongoose.models.FacultyFdpConducted ||
    mongoose.model<IFacultyFdpConducted>("FacultyFdpConducted", FacultyFdpConductedSchema);

export default FacultyFdpConducted;
