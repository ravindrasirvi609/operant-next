import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const greenCampusInitiativeTypeValues = [
    "TreePlantation",
    "SolarEnergy",
    "RainwaterHarvesting",
    "GreenAuditAwareness",
    "PlasticFreeCampus",
    "EnergyConservation",
    "CleanCampusDrive",
    "Other",
] as const;

export const greenCampusInitiativeStatusValues = [
    "Planned",
    "InProgress",
    "Completed",
    "Continuous",
] as const;

export type GreenCampusInitiativeType = (typeof greenCampusInitiativeTypeValues)[number];
export type GreenCampusInitiativeStatus = (typeof greenCampusInitiativeStatusValues)[number];

export interface IGreenCampusInitiative extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    initiativeType: GreenCampusInitiativeType;
    title: string;
    startDate?: Date;
    endDate?: Date;
    status: GreenCampusInitiativeStatus;
    impactDescription?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GreenCampusInitiativeSchema = new Schema<IGreenCampusInitiative>(
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
        initiativeType: {
            type: String,
            enum: greenCampusInitiativeTypeValues,
            required: true,
            default: "TreePlantation",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        status: {
            type: String,
            enum: greenCampusInitiativeStatusValues,
            required: true,
            default: "Planned",
            index: true,
        },
        impactDescription: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "green_campus_initiatives" }
);

GreenCampusInitiativeSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    initiativeType: 1,
    title: 1,
});

const GreenCampusInitiative: Model<IGreenCampusInitiative> =
    mongoose.models.GreenCampusInitiative ||
    mongoose.model<IGreenCampusInitiative>("GreenCampusInitiative", GreenCampusInitiativeSchema);

export default GreenCampusInitiative;
