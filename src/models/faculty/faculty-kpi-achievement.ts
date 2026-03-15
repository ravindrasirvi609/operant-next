import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyKpiAchievement extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    publicationsDone: number;
    fdpConducted: number;
    consultancyGenerated: number;
    resultPercentage: number;
    overallKpiScore: number;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyKpiAchievementSchema = new Schema<IFacultyKpiAchievement>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        publicationsDone: { type: Number, default: 0 },
        fdpConducted: { type: Number, default: 0 },
        consultancyGenerated: { type: Number, default: 0 },
        resultPercentage: { type: Number, default: 0 },
        overallKpiScore: { type: Number, default: 0 },
    },
    { timestamps: true, collection: "faculty_kpi_achievements" }
);

FacultyKpiAchievementSchema.index({ facultyId: 1, academicYearId: 1 }, { unique: true });

const FacultyKpiAchievement: Model<IFacultyKpiAchievement> =
    mongoose.models.FacultyKpiAchievement ||
    mongoose.model<IFacultyKpiAchievement>("FacultyKpiAchievement", FacultyKpiAchievementSchema);

export default FacultyKpiAchievement;

