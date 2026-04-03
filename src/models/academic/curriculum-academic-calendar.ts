import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumCalendarStatusValues = ["Draft", "Published", "Archived"] as const;

export type CurriculumCalendarStatus = (typeof curriculumCalendarStatusValues)[number];

export interface ICurriculumAcademicCalendar extends Document {
    institutionId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    title: string;
    startDate: Date;
    endDate: Date;
    status: CurriculumCalendarStatus;
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumAcademicCalendarSchema = new Schema<ICurriculumAcademicCalendar>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        title: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: curriculumCalendarStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "academic_calendars" }
);

CurriculumAcademicCalendarSchema.index({ institutionId: 1, academicYearId: 1, title: 1 }, { unique: true });

const CurriculumAcademicCalendar: Model<ICurriculumAcademicCalendar> =
    mongoose.models.CurriculumAcademicCalendar ||
    mongoose.model<ICurriculumAcademicCalendar>(
        "CurriculumAcademicCalendar",
        CurriculumAcademicCalendarSchema
    );

export default CurriculumAcademicCalendar;
