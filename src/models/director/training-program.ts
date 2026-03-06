import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITrainingProgramOrganized extends Document {
    year?: string;
    fromDate?: string;
    toDate?: string;
    titleOfProgram: string;
    typeOfStaff?: string;
    numberOfParticipants: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const TrainingProgramOrganizedSchema = new Schema<ITrainingProgramOrganized>(
    {
        year: {
            type: String,
            index: true,
        },
        fromDate: {
            type: String,
        },
        toDate: {
            type: String,
        },
        titleOfProgram: {
            type: String,
            required: [true, "Title of the program is required"],
            trim: true,
        },
        typeOfStaff: {
            type: String,
            trim: true,
        },
        numberOfParticipants: {
            type: Number,
            required: [true, "Number of participants is required"],
            min: [0, "Cannot be negative"],
        },
        uploadProof: {
            type: String,
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
        collection: "trainingprogramsorganizeds",
    }
);

const TrainingProgramOrganized: Model<ITrainingProgramOrganized> =
    mongoose.models.TrainingProgramOrganized ||
    mongoose.model<ITrainingProgramOrganized>(
        "TrainingProgramOrganized",
        TrainingProgramOrganizedSchema
    );

export default TrainingProgramOrganized;
