import mongoose, { Schema, Document, Model } from "mongoose";

export interface INirfStudentIntake extends Document {
    UG3?: Record<string, any>;
    UG4?: Record<string, any>;
    UG5?: Record<string, any>;
    UG6?: Record<string, any>;
    PG1?: Record<string, any>;
    PG2?: Record<string, any>;
    PG3?: Record<string, any>;
    PG6?: Record<string, any>;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfStudentIntakeSchema = new Schema<INirfStudentIntake>(
    {
        UG3: { type: Object },
        UG4: { type: Object },
        UG5: { type: Object },
        UG6: { type: Object },
        PG1: { type: Object },
        PG2: { type: Object },
        PG3: { type: Object },
        PG6: { type: Object },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "nirfstudentintakes",
    }
);

const NirfStudentIntake: Model<INirfStudentIntake> =
    mongoose.models.NirfStudentIntake ||
    mongoose.model<INirfStudentIntake>("NirfStudentIntake", NirfStudentIntakeSchema);

export default NirfStudentIntake;
