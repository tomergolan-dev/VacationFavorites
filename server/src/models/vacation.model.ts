import { Schema, model, Types } from "mongoose";

export interface Vacation {
    _id: Types.ObjectId;
    location: string;
    description: string;
    fromDate: Date;
    untilDate: Date;
    price: number;
    imageName?: string;
    followersCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const vacationSchema = new Schema<Vacation>(
    {
        location: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
        description: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        fromDate: { type: Date, required: true },
        untilDate: { type: Date, required: true },
        price: { type: Number, required: true, min: 250, max: 3000 },
        imageName: { type: String, default: "" },
        followersCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

vacationSchema.index({ fromDate: 1 });
vacationSchema.index({ followersCount: -1 });

export const VacationModel = model<Vacation>("Vacation", vacationSchema);
