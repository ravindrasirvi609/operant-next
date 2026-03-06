import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAqarRadioInfo extends Document {
    academicYear: string;
    radioId: string;
    radioInfo: string;
    school: string;
}

const AqarRadioInfoSchema = new Schema<IAqarRadioInfo>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        radioId: {
            type: String,
            required: [true, "Radio ID is required"],
        },
        radioInfo: {
            type: String,
            required: [true, "Radio info is required"],
        },
        school: {
            type: String,
            required: [true, "School is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "aqarradioinfos",
    }
);

const AqarRadioInfo: Model<IAqarRadioInfo> =
    mongoose.models.AqarRadioInfo ||
    mongoose.model<IAqarRadioInfo>("AqarRadioInfo", AqarRadioInfoSchema);

export default AqarRadioInfo;
