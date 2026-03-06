import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDegree extends Document {
    degreeName: string;
    title: string;
    subject: string;
    university: string;
    awardDate: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const DegreeSchema = new Schema<IDegree>(
    {
        degreeName: {
            type: String,
            required: [true, "Degree name is required"],
            trim: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },
        university: {
            type: String,
            required: [true, "University is required"],
            trim: true,
        },
        awardDate: {
            type: String,
            required: [true, "Award date is required"],
        },
        proof: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "degrees", // preserving original collection name
    }
);

const Degree: Model<IDegree> =
    mongoose.models.Degree || mongoose.model<IDegree>("Degree", DegreeSchema);

export default Degree;
