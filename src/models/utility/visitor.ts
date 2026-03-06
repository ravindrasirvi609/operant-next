import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisitor extends Document {
    visitorId: string;
}

const VisitorSchema = new Schema<IVisitor>(
    {
        visitorId: {
            type: String,
            required: [true, "Visitor ID is required"],
        },
    },
    {
        timestamps: true,
        collection: "uniquevisitors",
    }
);

const Visitor: Model<IVisitor> =
    mongoose.models.Visitor ||
    mongoose.model<IVisitor>("Visitor", VisitorSchema);

export default Visitor;
