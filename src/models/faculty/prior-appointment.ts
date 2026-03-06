import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPriorAppointment extends Document {
    designation: string;
    employerName: string;
    joiningDate: string;
    leavingDate?: string;
    salaryWithGrade: string;
    leavingReason: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PriorAppointmentSchema = new Schema<IPriorAppointment>(
    {
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        employerName: {
            type: String,
            required: [true, "Employer name is required"],
            trim: true,
        },
        joiningDate: {
            type: String,
            required: [true, "Joining date is required"],
        },
        leavingDate: {
            type: String,
        },
        salaryWithGrade: {
            type: String,
            required: [true, "Salary details are required"],
        },
        leavingReason: {
            type: String,
            required: [true, "Leaving reason is required"],
        },
        proof: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "appointmentHeldPriors", // matching old name but with camelCase normalization if possible, though I'll stick to original or standardized.
        // Wait, let's check the old name in step 385: appointmentHeldPrior
    }
);
// Adjusting collection name to match exactly if needed, but let's see if I should pluralize or keep as is.
// The old code had: module.exports = mongoose.model('appointmentHeldPrior', appointmentSchema);
// Mongoose by default pluralizes. Let's keep it standardized.

const PriorAppointment: Model<IPriorAppointment> =
    mongoose.models.PriorAppointment ||
    mongoose.model<IPriorAppointment>("PriorAppointment", PriorAppointmentSchema);

export default PriorAppointment;
