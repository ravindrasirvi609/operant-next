import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IForeignVisit extends Document {
    purposeOfVisit: string;
    institutionVisitedName: string;
    fromDate: string;
    toDate: string;
    year: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ForeignVisitSchema = new Schema<IForeignVisit>(
    {
        purposeOfVisit: {
            type: String,
            required: [true, "Purpose of visit is required"],
            trim: true,
        },
        institutionVisitedName: {
            type: String,
            required: [true, "Institution name is required"],
            trim: true,
        },
        fromDate: {
            type: String,
            required: [true, "From date is required"],
        },
        toDate: {
            type: String,
            required: [true, "To date is required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "foreignvisits",
    }
);

const ForeignVisit: Model<IForeignVisit> =
    mongoose.models.ForeignVisit ||
    mongoose.model<IForeignVisit>("ForeignVisit", ForeignVisitSchema);

export default ForeignVisit;
