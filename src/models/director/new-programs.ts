import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewProgram extends Document {
    programName: string;
    programCode: string;
    academicYear: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const NewProgramSchema = new Schema<INewProgram>(
    {
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
            uppercase: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
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
        collection: "newprograms",
    }
);

const NewProgram: Model<INewProgram> =
    mongoose.models.NewProgram ||
    mongoose.model<INewProgram>("NewProgram", NewProgramSchema);

export default NewProgram;
