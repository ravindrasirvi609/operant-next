import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUgcSapCas extends Document {
    nameOfSchemeProject: string;
    nameOfInvestigators: string;
    nameOfFundingAgency: string;
    typeOfAgency: string;
    nameOfDepartment?: string;
    yearOfAward: string;
    fundsProvidedInLakhs: number;
    durationOfProjectInYears: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const UgcSapCasSchema = new Schema<IUgcSapCas>(
    {
        nameOfSchemeProject: {
            type: String,
            required: [true, "Name of scheme/project is required"],
            trim: true,
        },
        nameOfInvestigators: {
            type: String,
            required: [true, "Name of investigators is required"],
            trim: true,
        },
        nameOfFundingAgency: {
            type: String,
            required: [true, "Funding agency name is required"],
            trim: true,
        },
        typeOfAgency: {
            type: String,
            required: [true, "Type of agency is required"],
            trim: true,
        },
        nameOfDepartment: {
            type: String,
            trim: true,
        },
        yearOfAward: {
            type: String,
            required: [true, "Year of award is required"],
            index: true,
        },
        fundsProvidedInLakhs: {
            type: Number,
            required: [true, "Funds provided is required"],
        },
        durationOfProjectInYears: {
            type: Number,
            required: [true, "Duration is required"],
        },
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
        collection: "ugcsapcasdstfistdbticssrs", // preserving original collection name
    }
);

const UgcSapCas: Model<IUgcSapCas> =
    mongoose.models.UgcSapCas ||
    mongoose.model<IUgcSapCas>("UgcSapCas", UgcSapCasSchema);

export default UgcSapCas;
