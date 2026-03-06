import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProjectsInternship extends Document {
    programCode: string;
    programName: string;
    nameOfStudent: string;
    uploadProof?: string;
    academicYear?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectsInternshipSchema = new Schema<IProjectsInternship>(
    {
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
            uppercase: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        nameOfStudent: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        academicYear: {
            type: String,
            index: true,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "projectsinternships",
    }
);

const ProjectsInternship: Model<IProjectsInternship> =
    mongoose.models.ProjectsInternship ||
    mongoose.model<IProjectsInternship>(
        "ProjectsInternship",
        ProjectsInternshipSchema
    );

export default ProjectsInternship;
