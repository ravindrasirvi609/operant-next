import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentStrengthNirf extends Document {
    UG3?: Record<string, any>;
    UG4?: Record<string, any>;
    UG5?: Record<string, any>;
    UG6?: Record<string, any>;
    PG1?: Record<string, any>;
    PG2?: Record<string, any>;
    PG3?: Record<string, any>;
    PGI?: Record<string, any>;
    PG6?: Record<string, any>;
    academicYear: string;
    school: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentStrengthNirfSchema = new Schema<IStudentStrengthNirf>(
    {
        UG3: { type: Object },
        UG4: { type: Object },
        UG5: { type: Object },
        UG6: { type: Object },
        PG1: { type: Object },
        PG2: { type: Object },
        PG3: { type: Object },
        PGI: { type: Object },
        PG6: { type: Object },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        school: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "studentstrengthnirfs", // normalized from TotalAnnualStudentStrength
    }
);

const StudentStrengthNirf: Model<IStudentStrengthNirf> =
    mongoose.models.StudentStrengthNirf ||
    mongoose.model<IStudentStrengthNirf>(
        "StudentStrengthNirf",
        StudentStrengthNirfSchema
    );

export default StudentStrengthNirf;
