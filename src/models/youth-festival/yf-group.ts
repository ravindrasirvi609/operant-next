import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfGroup extends Document {
    participantNames: string;
    namesOfCompetition: string;
    college: mongoose.Types.ObjectId;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const YfGroupSchema = new Schema<IYfGroup>(
    {
        participantNames: {
            type: String,
            required: [true, "Participant names are required"],
        },
        namesOfCompetition: {
            type: String,
            required: [true, "Competition names are required"],
        },
        college: {
            type: Schema.Types.ObjectId,
            required: [true, "College reference is required"],
            ref: "YfCollege",
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "yfgroups",
    }
);

const YfGroup: Model<IYfGroup> =
    mongoose.models.YfGroup || mongoose.model<IYfGroup>("YfGroup", YfGroupSchema);

export default YfGroup;
