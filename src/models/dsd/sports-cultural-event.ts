import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISportsAndCulturalEvent extends Document {
    dateOfEvent: string;
    nameOfEvent: string;
    academicYear: string;
    userType: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SportsAndCulturalEventSchema = new Schema<ISportsAndCulturalEvent>(
    {
        dateOfEvent: {
            type: String,
            required: [true, "Date is required"],
        },
        nameOfEvent: {
            type: String,
            required: [true, "Event name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        userType: {
            type: String,
            required: [true, "User type is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "sportsandculturalevents",
    }
);

const SportsAndCulturalEvent: Model<ISportsAndCulturalEvent> =
    mongoose.models.SportsAndCulturalEvent ||
    mongoose.model<ISportsAndCulturalEvent>(
        "SportsAndCulturalEvent",
        SportsAndCulturalEventSchema
    );

export default SportsAndCulturalEvent;
