import mongoose, { Document, Model, Schema } from "mongoose";

export interface INaacCriteriaMapping extends Document {
    criteriaCode: string;
    criteriaName: string;
    tableName: string;
    fieldReference: string;
    weightage: number;
    createdAt: Date;
    updatedAt: Date;
}

const NaacCriteriaMappingSchema = new Schema<INaacCriteriaMapping>(
    {
        criteriaCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        criteriaName: { type: String, required: true, trim: true },
        tableName: { type: String, required: true, trim: true, index: true },
        fieldReference: { type: String, required: true, trim: true },
        weightage: { type: Number, default: 0 },
    },
    { timestamps: true, collection: "naac_criteria_mapping" }
);

NaacCriteriaMappingSchema.index({ criteriaCode: 1, tableName: 1, fieldReference: 1 }, { unique: true });
NaacCriteriaMappingSchema.index({ tableName: 1, criteriaCode: 1 });

const NaacCriteriaMapping: Model<INaacCriteriaMapping> =
    mongoose.models.NaacCriteriaMapping ||
    mongoose.model<INaacCriteriaMapping>("NaacCriteriaMapping", NaacCriteriaMappingSchema);

export default NaacCriteriaMapping;

