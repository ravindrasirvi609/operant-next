import mongoose, { Document, Model, Schema } from "mongoose";

export type ReportTemplateType =
    | "PBAS_APPRAISAL"
    | "AQAR_FACULTY"
    | "AQAR_CYCLE"
    | "FACULTY_CAS"
    | "FACULTY_PBAS";

export interface IReportTemplateSection {
    key: string;
    title: string;
    body: string;
    order: number;
    isActive: boolean;
}

export interface IReportTemplate extends Document {
    reportType: ReportTemplateType;
    name: string;
    description?: string;
    version: number;
    isActive: boolean;
    titleTemplate: string;
    subtitleTemplate?: string;
    metaTemplate?: string;
    introTemplate?: string;
    footerTemplate?: string;
    sections: IReportTemplateSection[];
    createdAt: Date;
    updatedAt: Date;
}

const ReportTemplateSectionSchema = new Schema<IReportTemplateSection>(
    {
        key: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },
        order: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, default: true },
    },
    { _id: false }
);

const ReportTemplateSchema = new Schema<IReportTemplate>(
    {
        reportType: {
            type: String,
            enum: ["PBAS_APPRAISAL", "AQAR_FACULTY", "AQAR_CYCLE", "FACULTY_CAS", "FACULTY_PBAS"],
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        version: { type: Number, required: true, min: 1, default: 1 },
        isActive: { type: Boolean, default: true, index: true },
        titleTemplate: { type: String, required: true, trim: true },
        subtitleTemplate: { type: String, trim: true },
        metaTemplate: { type: String, trim: true },
        introTemplate: { type: String, trim: true },
        footerTemplate: { type: String, trim: true },
        sections: { type: [ReportTemplateSectionSchema], default: [] },
    },
    { timestamps: true, collection: "report_templates" }
);

ReportTemplateSchema.index({ reportType: 1, version: 1 }, { unique: true });
ReportTemplateSchema.index({ reportType: 1, isActive: 1, updatedAt: -1 });

const ReportTemplate: Model<IReportTemplate> =
    mongoose.models.ReportTemplate ||
    mongoose.model<IReportTemplate>("ReportTemplate", ReportTemplateSchema);

export default ReportTemplate;
