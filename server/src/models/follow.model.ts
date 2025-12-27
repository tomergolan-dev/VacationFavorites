import { Schema, model, Types } from "mongoose";

export interface Follow {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    vacationId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const followSchema = new Schema<Follow>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        vacationId: { type: Schema.Types.ObjectId, ref: "Vacation", required: true },
    },
    { timestamps: true }
);

// prevent duplicate follow
followSchema.index({ userId: 1, vacationId: 1 }, { unique: true });

export const FollowModel = model<Follow>("Follow", followSchema);
