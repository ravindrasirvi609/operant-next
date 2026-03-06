import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewsItem extends Document {
    headline: string;
    date: string;
    description?: string;
    photoURLs: string[];
    createdAt: Date;
    updatedAt: Date;
}

const NewsItemSchema = new Schema<INewsItem>(
    {
        headline: {
            type: String,
            required: [true, "Headline is required"],
            trim: true,
        },
        date: {
            type: String,
            required: [true, "Date is required"],
        },
        description: {
            type: String,
        },
        photoURLs: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: "news",
    }
);

const NewsItem: Model<INewsItem> =
    mongoose.models.NewsItem || mongoose.model<INewsItem>("NewsItem", NewsItemSchema);

export default NewsItem;
