import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyProjectType = "Minor" | "Major" | "Industry";
export type FacultyProjectStatus = "Planned" | "Ongoing" | "Completed" | "Closed";

export interface IFacultyResearchProject extends Document {
    facultyId: Types.ObjectId;
    title: string;
    fundingAgency?: string;
    projectType: FacultyProjectType;
    amountSanctioned?: number;
    startDate?: Date;
    endDate?: Date;
    status: FacultyProjectStatus;
    principalInvestigator: boolean;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyResearchProjectSchema = new Schema<IFacultyResearchProject>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        fundingAgency: { type: String, trim: true },
        projectType: {
            type: String,
            required: true,
            enum: ["Minor", "Major", "Industry"],
            index: true,
        },
        amountSanctioned: { type: Number, min: 0 },
        startDate: { type: Date },
        endDate: { type: Date },
        status: {
            type: String,
            required: true,
            enum: ["Planned", "Ongoing", "Completed", "Closed"],
            default: "Ongoing",
            index: true,
        },
        principalInvestigator: { type: Boolean, default: false, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_research_projects" }
);

FacultyResearchProjectSchema.index({ facultyId: 1, title: 1, startDate: 1 });

const FacultyResearchProject: Model<IFacultyResearchProject> =
    mongoose.models.FacultyResearchProject ||
    mongoose.model<IFacultyResearchProject>("FacultyResearchProject", FacultyResearchProjectSchema);

export default FacultyResearchProject;
