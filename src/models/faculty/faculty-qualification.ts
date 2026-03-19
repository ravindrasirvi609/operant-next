import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyQualification extends Document {
    facultyId: Types.ObjectId;
    level: string;
    degree: string;
    subject?: string;
    institution?: string;
    year?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyQualificationSchema = new Schema<IFacultyQualification>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        level: { type: String, required: true, trim: true },
        degree: { type: String, required: true, trim: true },
        subject: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true },
    },
    { timestamps: true, collection: "faculty_qualifications" }
);

FacultyQualificationSchema.index({ facultyId: 1, degree: 1, year: 1 });

const FacultyQualification: Model<IFacultyQualification> =
    mongoose.models.FacultyQualification ||
    mongoose.model<IFacultyQualification>("FacultyQualification", FacultyQualificationSchema);

export default FacultyQualification;
