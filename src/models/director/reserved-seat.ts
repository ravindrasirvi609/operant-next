import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReservedSeat extends Document {
    academicYear: string;
    programName: string;
    nseSC: number;
    nseST: number;
    nseOBC: number;
    nseDivyngjan: number;
    nseGeneral: number;
    nseOthers: number;
    nsaSC: number;
    nsaST: number;
    nsaOBC: number;
    nsaDivyngjan: number;
    nsaGeneral: number;
    nsaOthers: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReservedSeatSchema = new Schema<IReservedSeat>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        nseSC: { type: Number, required: true, default: 0 },
        nseST: { type: Number, required: true, default: 0 },
        nseOBC: { type: Number, required: true, default: 0 },
        nseDivyngjan: { type: Number, required: true, default: 0 },
        nseGeneral: { type: Number, required: true, default: 0 },
        nseOthers: { type: Number, required: true, default: 0 },
        nsaSC: { type: Number, required: true, default: 0 },
        nsaST: { type: Number, required: true, default: 0 },
        nsaOBC: { type: Number, required: true, default: 0 },
        nsaDivyngjan: { type: Number, required: true, default: 0 },
        nsaGeneral: { type: Number, required: true, default: 0 },
        nsaOthers: { type: Number, required: true, default: 0 },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "reservedseats",
    }
);

const ReservedSeat: Model<IReservedSeat> =
    mongoose.models.ReservedSeat ||
    mongoose.model<IReservedSeat>("ReservedSeat", ReservedSeatSchema);

export default ReservedSeat;
