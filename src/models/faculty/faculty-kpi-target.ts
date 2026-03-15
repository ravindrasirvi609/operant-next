import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyKpiTarget extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    researchPublicationsTarget: number;
    fdpTarget: number;
    consultancyTarget: number;
    resultTargetPercentage: number;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyKpiTargetSchema = new Schema<IFacultyKpiTarget>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        researchPublicationsTarget: { type: Number, default: 0 },
        fdpTarget: { type: Number, default: 0 },
        consultancyTarget: { type: Number, default: 0 },
        resultTargetPercentage: { type: Number, default: 0 },
    },
    { timestamps: true, collection: "faculty_kpi_targets" }
);

FacultyKpiTargetSchema.index({ facultyId: 1, academicYearId: 1 }, { unique: true });

const FacultyKpiTarget: Model<IFacultyKpiTarget> =
    mongoose.models.FacultyKpiTarget ||
    mongoose.model<IFacultyKpiTarget>("FacultyKpiTarget", FacultyKpiTargetSchema);

export default FacultyKpiTarget;

