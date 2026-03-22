import mongoose, { Document, Model, Schema, Types } from "mongoose";

import type {
    WorkflowApproverRole,
    WorkflowModuleName,
    WorkflowStageKind,
} from "@/models/core/workflow-definition";

export interface IWorkflowInstance extends Document {
    moduleName: WorkflowModuleName;
    recordId: string;
    definitionId: Types.ObjectId;
    definitionVersion: number;
    status: string;
    currentStageKey?: string;
    currentStageLabel?: string;
    currentStageKind?: WorkflowStageKind;
    currentApproverRoles: WorkflowApproverRole[];
    currentApproverLabel?: string;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    isActive: boolean;
    startedAt?: Date;
    completedAt?: Date;
    lastAction?: string;
    lastActorId?: Types.ObjectId;
    lastActorName?: string;
    lastActorRole?: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowInstanceSchema = new Schema<IWorkflowInstance>(
    {
        moduleName: {
            type: String,
            enum: ["PBAS", "CAS", "AQAR"],
            required: true,
            index: true,
        },
        recordId: { type: String, required: true, trim: true, index: true },
        definitionId: {
            type: Schema.Types.ObjectId,
            ref: "WorkflowDefinition",
            required: true,
            index: true,
        },
        definitionVersion: { type: Number, required: true, default: 1 },
        status: { type: String, required: true, trim: true, index: true },
        currentStageKey: { type: String, trim: true },
        currentStageLabel: { type: String, trim: true },
        currentStageKind: {
            type: String,
            enum: ["review", "final"],
        },
        currentApproverRoles: {
            type: [
                {
                    type: String,
                    enum: [
                        "FACULTY",
                        "DEPARTMENT_HEAD",
                        "DIRECTOR",
                        "IQAC",
                        "PBAS_COMMITTEE",
                        "CAS_COMMITTEE",
                        "AQAR_COMMITTEE",
                        "PRINCIPAL",
                        "ADMIN",
                    ],
                },
            ],
            default: [],
            index: true,
        },
        currentApproverLabel: { type: String, trim: true },
        scopeDepartmentName: { type: String, trim: true, index: true },
        scopeCollegeName: { type: String, trim: true, index: true },
        scopeUniversityName: { type: String, trim: true, index: true },
        isActive: { type: Boolean, required: true, default: false, index: true },
        startedAt: { type: Date },
        completedAt: { type: Date },
        lastAction: { type: String, trim: true },
        lastActorId: { type: Schema.Types.ObjectId, ref: "User" },
        lastActorName: { type: String, trim: true },
        lastActorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "workflow_instances" }
);

WorkflowInstanceSchema.index({ moduleName: 1, recordId: 1 }, { unique: true });
WorkflowInstanceSchema.index({ moduleName: 1, isActive: 1, currentStageKind: 1, updatedAt: -1 });

const WorkflowInstance: Model<IWorkflowInstance> =
    mongoose.models.WorkflowInstance ||
    mongoose.model<IWorkflowInstance>("WorkflowInstance", WorkflowInstanceSchema);

export default WorkflowInstance;
