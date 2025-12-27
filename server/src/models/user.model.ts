import mongoose, { Schema } from "mongoose";

export type UserRole = "user" | "admin";

const userSchema = new Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName:  { type: String, required: true, trim: true },
        email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },

        role: { type: String, enum: ["user", "admin"], default: "user" },

        emailVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: null },
        verificationTokenExpires: { type: Date, default: null },
    },
    { timestamps: true }
);

userSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.set("toJSON", {
    virtuals: true,
    transform: (_: any, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        delete ret.id;
        return ret;
    },
});

export default mongoose.model("User", userSchema);
