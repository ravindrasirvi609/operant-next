import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultySocialExtension extends Document {
    facultyId: Types.ObjectId;
    programId: Types.ObjectId;
    activityName: string;
    hoursContributed?: number;
    academicYearId?: Types.ObjectId;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultySocialExtensionSchema = new Schema<IFacultySocialExtension>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "SocialProgram", required: true, index: true },
        activityName: { type: String, required: true, trim: true },
        hoursContributed: { type: Number, min: 0 },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_social_extension" }
);

FacultySocialExtensionSchema.index({ facultyId: 1, programId: 1, academicYearId: 1, activityName: 1 }, { unique: true, sparse: true });

const FacultySocialExtension: Model<IFacultySocialExtension> =
    mongoose.models.FacultySocialExtension ||
    mongoose.model<IFacultySocialExtension>("FacultySocialExtension", FacultySocialExtensionSchema);

export default FacultySocialExtension;
