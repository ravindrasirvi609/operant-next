import mongoose, { Schema, Document, Model } from "mongoose";

export interface INirfProgram extends Document {
    programs: string[];
    schoolName: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfProgramSchema = new Schema<INirfProgram>(
    {
        programs: {
            type: [String],
            default: [],
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "nirfprograms",
    }
);

const NirfProgram: Model<INirfProgram> =
    mongoose.models.NirfProgram ||
    mongoose.model<INirfProgram>("NirfProgram", NirfProgramSchema);

export default NirfProgram;
