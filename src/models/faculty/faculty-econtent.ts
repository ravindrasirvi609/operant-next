import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyEcontentPlatform = "youtube" | "moodle" | "swayam" | "other";
export type FacultyEcontentType = "video" | "module" | "ppt" | "other";

export interface IFacultyEcontent extends Document {
    facultyId: Types.ObjectId;
    title: string;
    platform: FacultyEcontentPlatform;
    url: string;
    contentType: FacultyEcontentType;
    academicYearId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyEcontentSchema = new Schema<IFacultyEcontent>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        platform: {
            type: String,
            enum: ["youtube", "moodle", "swayam", "other"],
            required: true,
            index: true,
        },
        url: { type: String, required: true, trim: true },
        contentType: {
            type: String,
            enum: ["video", "module", "ppt", "other"],
            required: true,
            index: true,
        },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    },
    { timestamps: true, collection: "faculty_econtent" }
);

FacultyEcontentSchema.index({ facultyId: 1, academicYearId: 1, platform: 1 });

const FacultyEcontent: Model<IFacultyEcontent> =
    mongoose.models.FacultyEcontent ||
    mongoose.model<IFacultyEcontent>("FacultyEcontent", FacultyEcontentSchema);

export default FacultyEcontent;

