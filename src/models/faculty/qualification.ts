import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IQualification extends Document {
    exam: string;
    year: string;
    percentage: string;
    subjects: string;
    userId: Types.ObjectId;
    institute: string;
    createdAt: Date;
    updatedAt: Date;
}

const QualificationSchema = new Schema<IQualification>(
    {
        exam: {
            type: String,
            required: [true, "Exam is required"],
            trim: true,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        percentage: {
            type: String,
            required: [true, "Percentage is required"],
        },
        subjects: {
            type: String,
            required: [true, "Subjects are required"],
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
        institute: {
            type: String,
            required: [true, "Institute is required"],
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "qualifications", // preserving original collection name
    }
);

const Qualification: Model<IQualification> =
    mongoose.models.Qualification ||
    mongoose.model<IQualification>("Qualification", QualificationSchema);

export default Qualification;
