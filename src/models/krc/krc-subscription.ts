import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKrcSubscription extends Document {
    libraryResources: string;
    eBooks: string;
    eResources: string;
    academicYear: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const KrcSubscriptionSchema = new Schema<IKrcSubscription>(
    {
        libraryResources: {
            type: String,
            required: [true, "Library resources info is required"],
        },
        eBooks: {
            type: String,
            required: [true, "e-Books info is required"],
        },
        eResources: {
            type: String,
            required: [true, "e-Resources info is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "krcsubscriptions", // normalized from SubscriptionForKRC
    }
);

const KrcSubscription: Model<IKrcSubscription> =
    mongoose.models.KrcSubscription ||
    mongoose.model<IKrcSubscription>("KrcSubscription", KrcSubscriptionSchema);

export default KrcSubscription;
