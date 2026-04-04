import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISssResponseDetail extends Document {
    responseId: Types.ObjectId;
    questionId: Types.ObjectId;
    ratingValue: number;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SssResponseDetailSchema = new Schema<ISssResponseDetail>(
    {
        responseId: { type: Schema.Types.ObjectId, ref: "SssResponse", required: true, index: true },
        questionId: { type: Schema.Types.ObjectId, ref: "SssQuestion", required: true, index: true },
        ratingValue: { type: Number, required: true, min: 1 },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "sss_response_details" }
);

SssResponseDetailSchema.index({ responseId: 1, questionId: 1 }, { unique: true });

const SssResponseDetail: Model<ISssResponseDetail> =
    mongoose.models.SssResponseDetail ||
    mongoose.model<ISssResponseDetail>("SssResponseDetail", SssResponseDetailSchema);

export default SssResponseDetail;
