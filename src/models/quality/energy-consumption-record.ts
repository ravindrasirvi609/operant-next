import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const energySourceValues = [
    "Electricity",
    "Solar",
    "Generator",
    "Other",
] as const;

export type EnergySource = (typeof energySourceValues)[number];

export interface IEnergyConsumptionRecord extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    energySource: EnergySource;
    academicYearId?: Types.ObjectId;
    unitsConsumed?: number;
    costIncurred?: number;
    recordedMonth?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const EnergyConsumptionRecordSchema = new Schema<IEnergyConsumptionRecord>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        energySource: {
            type: String,
            enum: energySourceValues,
            required: true,
            default: "Electricity",
            index: true,
        },
        academicYearId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicYear",
        },
        unitsConsumed: { type: Number, min: 0 },
        costIncurred: { type: Number, min: 0 },
        recordedMonth: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "energy_consumption_records" }
);

EnergyConsumptionRecordSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    energySource: 1,
    recordedMonth: 1,
});

const EnergyConsumptionRecord: Model<IEnergyConsumptionRecord> =
    mongoose.models.EnergyConsumptionRecord ||
    mongoose.model<IEnergyConsumptionRecord>(
        "EnergyConsumptionRecord",
        EnergyConsumptionRecordSchema
    );

export default EnergyConsumptionRecord;
