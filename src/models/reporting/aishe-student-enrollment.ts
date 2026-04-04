import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheStudentEnrollment extends Document {
    surveyCycleId: Types.ObjectId;
    programId: Types.ObjectId;
    maleStudents: number;
    femaleStudents: number;
    transgenderStudents: number;
    scStudents: number;
    stStudents: number;
    obcStudents: number;
    generalStudents: number;
    pwdStudents: number;
    foreignStudents: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheStudentEnrollmentSchema = new Schema<IAisheStudentEnrollment>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        maleStudents: { type: Number, min: 0, default: 0 },
        femaleStudents: { type: Number, min: 0, default: 0 },
        transgenderStudents: { type: Number, min: 0, default: 0 },
        scStudents: { type: Number, min: 0, default: 0 },
        stStudents: { type: Number, min: 0, default: 0 },
        obcStudents: { type: Number, min: 0, default: 0 },
        generalStudents: { type: Number, min: 0, default: 0 },
        pwdStudents: { type: Number, min: 0, default: 0 },
        foreignStudents: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_student_enrollment" }
);

AisheStudentEnrollmentSchema.index({ surveyCycleId: 1, programId: 1 }, { unique: true });

const AisheStudentEnrollment: Model<IAisheStudentEnrollment> =
    mongoose.models.AisheStudentEnrollment ||
    mongoose.model<IAisheStudentEnrollment>("AisheStudentEnrollment", AisheStudentEnrollmentSchema);

export default AisheStudentEnrollment;
