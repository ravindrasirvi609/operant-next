import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAqarTextInfo extends Document {
    academicYear: string;
    tableId: string;
    tableData: string;
    school: string;
}

const AqarTextInfoSchema = new Schema<IAqarTextInfo>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        tableId: {
            type: String,
            required: [true, "Table ID is required"],
        },
        tableData: {
            type: String,
            required: [true, "Table data is required"],
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
        collection: "aqartextinfos",
    }
);

const AqarTextInfo: Model<IAqarTextInfo> =
    mongoose.models.AqarTextInfo ||
    mongoose.model<IAqarTextInfo>("AqarTextInfo", AqarTextInfoSchema);

export default AqarTextInfo;
