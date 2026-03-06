import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfCompetition extends Document {
    competitionName: string;
    students: mongoose.Types.ObjectId[];
    isGroup: boolean;
    academicYear: string;
    college: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const YfCompetitionSchema = new Schema<IYfCompetition>(
    {
        competitionName: {
            type: String,
            required: [true, "Competition name is required"],
            trim: true,
        },
        students: [
            {
                type: Schema.Types.ObjectId,
                ref: "YfStudent",
                required: true,
            },
        ],
        isGroup: {
            type: Boolean,
            default: true,
            required: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        college: {
            type: Schema.Types.ObjectId,
            ref: "YfCollege",
            required: [true, "College reference is required"],
        },
    },
    {
        timestamps: true,
        collection: "yfcompetitions",
    }
);

const YfCompetition: Model<IYfCompetition> =
    mongoose.models.YfCompetition ||
    mongoose.model<IYfCompetition>("YfCompetition", YfCompetitionSchema);

export default YfCompetition;
