import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumCalendarEventTypeValues = [
    "Exam",
    "Holiday",
    "Semester Start",
    "Activity",
    "Other",
] as const;

export type CurriculumCalendarEventType = (typeof curriculumCalendarEventTypeValues)[number];

export interface ICurriculumAcademicCalendarEvent extends Document {
    calendarId: Types.ObjectId;
    eventTitle: string;
    eventType: CurriculumCalendarEventType;
    startDate: Date;
    endDate?: Date;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumAcademicCalendarEventSchema = new Schema<ICurriculumAcademicCalendarEvent>(
    {
        calendarId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumAcademicCalendar",
            required: true,
            index: true,
        },
        eventTitle: { type: String, required: true, trim: true },
        eventType: {
            type: String,
            enum: curriculumCalendarEventTypeValues,
            required: true,
            default: "Other",
            index: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        description: { type: String, trim: true },
    },
    { timestamps: true, collection: "academic_calendar_events" }
);

CurriculumAcademicCalendarEventSchema.index({ calendarId: 1, startDate: 1, eventTitle: 1 });

const CurriculumAcademicCalendarEvent: Model<ICurriculumAcademicCalendarEvent> =
    mongoose.models.CurriculumAcademicCalendarEvent ||
    mongoose.model<ICurriculumAcademicCalendarEvent>(
        "CurriculumAcademicCalendarEvent",
        CurriculumAcademicCalendarEventSchema
    );

export default CurriculumAcademicCalendarEvent;
