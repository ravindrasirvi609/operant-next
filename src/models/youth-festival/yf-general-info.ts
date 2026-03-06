import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfGeneralInfo extends Document {
    academicYear: string;
    college: mongoose.Types.ObjectId;
    info: string;
    createdAt: Date;
    updatedAt: Date;
}

const YfGeneralInfoSchema = new Schema<IYfGeneralInfo>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        college: {
            type: Schema.Types.ObjectId,
            required: [true, "College reference is required"],
            ref: "YfCollege",
        },
        info: {
            type: String,
            required: [true, "Information is required"],
        },
    },
    {
        timestamps: true,
        collection: "yfgeneralinfos",
    }
);

const YfGeneralInfo: Model<IYfGeneralInfo> =
    mongoose.models.YfGeneralInfo ||
    mongoose.model<IYfGeneralInfo>("YfGeneralInfo", YfGeneralInfoSchema);

export default YfGeneralInfo;
