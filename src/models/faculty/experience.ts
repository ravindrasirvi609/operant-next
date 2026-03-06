import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IExperience extends Document {
    ug: string;
    pg: string;
    researchExperience: string;
    specialization: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExperienceSchema = new Schema<IExperience>(
    {
        ug: {
            type: String,
            required: [true, "UG experience is required"],
        },
        pg: {
            type: String,
            required: [true, "PG experience is required"],
        },
        researchExperience: {
            type: String,
            required: [true, "Research experience is required"],
        },
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
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
        collection: "experience", // preserving original collection name
    }
);

const Experience: Model<IExperience> =
    mongoose.models.Experience ||
    mongoose.model<IExperience>("Experience", ExperienceSchema);

export default Experience;
