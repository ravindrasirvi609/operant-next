import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStatusBase extends Document {
    submitted: string[];
    createdAt: Date;
    updatedAt: Date;
}

const StatusSchema = new Schema<IStatusBase>(
    {
        submitted: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const createStatusModel = (modelName: string, collectionName: string) => {
    return (
        mongoose.models[modelName] ||
        mongoose.model<IStatusBase>(modelName, StatusSchema, collectionName)
    );
};

export const DsdAqar = createStatusModel("DsdAqar", "dsdaqars");
export const PlacementAqar = createStatusModel("PlacementAqar", "placementaqars");
export const KrcAqar = createStatusModel("KrcAqar", "krcaqars");
export const ExamAqar = createStatusModel("ExamAqar", "examaqars");
export const EsttAqar = createStatusModel("EsttAqar", "esttaqars");
export const NssAqar = createStatusModel("NssAqar", "nssaqars");
export const IilAqar = createStatusModel("IilAqar", "iilaqars");
export const SportsAqar = createStatusModel("SportsAqar", "sportsaqars");
export const OtherAqar = createStatusModel("OtherAqar", "otheraqars");
export const SchoolAqar = createStatusModel("SchoolAqar", "schoolaqars");
export const SchoolNirf = createStatusModel("SchoolNirf", "schoolnirfs");
export const YfSubmitted = createStatusModel("YfSubmitted", "yfsubmitteds");
