import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConstructionRenovation extends Document {
    tabId: string;
    title: string;
    infraId: string;
    status: string;
    statusInPercentage: string;
    beforePhotos: any[];
    ongoingPhotos: any[];
    afterPhotos: any[];
    landPhotos: Record<string, any>;
    outcomes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ConstructionRenovationSchema = new Schema<IConstructionRenovation>(
    {
        tabId: {
            type: String,
            required: [true, "Tab ID is required"],
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        infraId: {
            type: String,
            required: [true, "Infrastructure ID is required"],
        },
        status: {
            type: String,
            default: "Not yet started",
        },
        statusInPercentage: {
            type: String,
            default: "0",
        },
        beforePhotos: {
            type: [{ type: Schema.Types.Mixed }],
            default: [],
        },
        ongoingPhotos: {
            type: [{ type: Schema.Types.Mixed }],
            default: [],
        },
        afterPhotos: {
            type: [{ type: Schema.Types.Mixed }],
            default: [],
        },
        landPhotos: {
            type: Object,
            default: {},
        },
        outcomes: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "constructionrenovationstatuses",
    }
);

const ConstructionRenovation: Model<IConstructionRenovation> =
    mongoose.models.ConstructionRenovation ||
    mongoose.model<IConstructionRenovation>(
        "ConstructionRenovation",
        ConstructionRenovationSchema
    );

export default ConstructionRenovation;
