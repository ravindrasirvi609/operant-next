import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISssResponseDetail extends Document {
    responseId: Types.ObjectId;
    questionId: Types.ObjectId;
    // Exactly one of these is set, matching the answered question's type.
    ratingValue?: number;
    textAnswer?: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SssResponseDetailSchema = new Schema<ISssResponseDetail>(
    {
        responseId: { type: Schema.Types.ObjectId, ref: "SssResponse", required: true, index: true },
        questionId: { type: Schema.Types.ObjectId, ref: "SssQuestion", required: true, index: true },
        ratingValue: { type: Number, min: 1 },
        textAnswer: { type: String, trim: true },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "sss_response_details" }
);

SssResponseDetailSchema.index({ responseId: 1, questionId: 1 }, { unique: true });

const SssResponseDetail: Model<ISssResponseDetail> =
    mongoose.models.SssResponseDetail ||
    mongoose.model<ISssResponseDetail>("SssResponseDetail", SssResponseDetailSchema);

export default SssResponseDetail;
