import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPlacement extends Document {
    studentId: Types.ObjectId;
    companyName: string;
    jobRole?: string;
    package?: number;
    offerDate?: Date;
    joiningDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PlacementSchema = new Schema<IPlacement>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        companyName: { type: String, required: true, trim: true },
        jobRole: { type: String, trim: true },
        package: { type: Number, min: 0 },
        offerDate: { type: Date },
        joiningDate: { type: Date },
    },
    { timestamps: true, collection: "placements" }
);

PlacementSchema.index({ studentId: 1, offerDate: -1 });

const Placement: Model<IPlacement> =
    mongoose.models.Placement ||
    mongoose.model<IPlacement>("Placement", PlacementSchema);

export default Placement;
