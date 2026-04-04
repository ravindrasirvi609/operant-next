import mongoose, { Document, Model, Schema } from "mongoose";

export type WorkflowModuleName =
    | "PBAS"
    | "CAS"
    | "AQAR"
    | "SSR"
    | "CURRICULUM"
    | "TEACHING_LEARNING"
    | "RESEARCH_INNOVATION"
    | "INFRASTRUCTURE_LIBRARY"
    | "STUDENT_SUPPORT_GOVERNANCE"
    | "GOVERNANCE_LEADERSHIP_IQAC"
    | "INSTITUTIONAL_VALUES_BEST_PRACTICES";
export type WorkflowStageKind = "review" | "final";
export type WorkflowStageScope = "global" | "department";
export type WorkflowApproverRole =
    | "FACULTY"
    | "DEPARTMENT_HEAD"
    | "BOARD_OF_STUDIES"
    | "DIRECTOR"
    | "OFFICE_HEAD"
    | "IQAC"
    | "PBAS_COMMITTEE"
    | "CAS_COMMITTEE"
    | "AQAR_COMMITTEE"
    | "SSR_COMMITTEE"
    | "TEACHING_LEARNING_COMMITTEE"
    | "RESEARCH_COMMITTEE"
    | "INFRASTRUCTURE_LIBRARY_COMMITTEE"
    | "STUDENT_SUPPORT_GOVERNANCE_COMMITTEE"
    | "PRINCIPAL"
    | "ADMIN";

export interface IWorkflowDefinitionStage {
    key: string;
    label: string;
    status: string;
    kind: WorkflowStageKind;
    scope: WorkflowStageScope;
    approverRoles: WorkflowApproverRole[];
}

export interface IWorkflowDefinition extends Document {
    moduleName: WorkflowModuleName;
    name: string;
    version: number;
    isActive: boolean;
    draftStatus: string;
    approvedStatus: string;
    rejectedStatus: string;
    stages: IWorkflowDefinitionStage[];
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowDefinitionStageSchema = new Schema<IWorkflowDefinitionStage>(
    {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        status: { type: String, required: true, trim: true },
        kind: {
            type: String,
            enum: ["review", "final"],
            required: true,
        },
        scope: {
            type: String,
            enum: ["global", "department"],
            default: "global",
            required: true,
        },
        approverRoles: {
            type: [
                {
                    type: String,
                    enum: [
                        "FACULTY",
                        "DEPARTMENT_HEAD",
                        "BOARD_OF_STUDIES",
                        "DIRECTOR",
                        "OFFICE_HEAD",
                        "IQAC",
                        "PBAS_COMMITTEE",
                        "CAS_COMMITTEE",
                        "AQAR_COMMITTEE",
                        "SSR_COMMITTEE",
                        "TEACHING_LEARNING_COMMITTEE",
                        "RESEARCH_COMMITTEE",
                        "INFRASTRUCTURE_LIBRARY_COMMITTEE",
                        "STUDENT_SUPPORT_GOVERNANCE_COMMITTEE",
                        "PRINCIPAL",
                        "ADMIN",
                    ],
                },
            ],
            default: [],
            required: true,
        },
    },
    { _id: false }
);

const WorkflowDefinitionSchema = new Schema<IWorkflowDefinition>(
    {
        moduleName: {
            type: String,
            enum: [
                "PBAS",
                "CAS",
                "AQAR",
                "SSR",
                "CURRICULUM",
                "TEACHING_LEARNING",
                "RESEARCH_INNOVATION",
                "INFRASTRUCTURE_LIBRARY",
                "STUDENT_SUPPORT_GOVERNANCE",
                "GOVERNANCE_LEADERSHIP_IQAC",
                "INSTITUTIONAL_VALUES_BEST_PRACTICES",
            ],
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        version: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, required: true, default: true, index: true },
        draftStatus: { type: String, required: true, trim: true, default: "Draft" },
        approvedStatus: { type: String, required: true, trim: true, default: "Approved" },
        rejectedStatus: { type: String, required: true, trim: true, default: "Rejected" },
        stages: { type: [WorkflowDefinitionStageSchema], default: [] },
    },
    { timestamps: true, collection: "workflow_definitions" }
);

WorkflowDefinitionSchema.index({ moduleName: 1, version: 1 }, { unique: true });
WorkflowDefinitionSchema.index({ moduleName: 1, isActive: 1, updatedAt: -1 });

const WorkflowDefinition: Model<IWorkflowDefinition> =
    mongoose.models.WorkflowDefinition ||
    mongoose.model<IWorkflowDefinition>("WorkflowDefinition", WorkflowDefinitionSchema);

export default WorkflowDefinition;
