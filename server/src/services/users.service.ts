import User from "../models/user.model";

export async function findAllUsers() {
    return User.find().sort({ createdAt: -1 }).select("-password -passwordHash");
}

export async function findUserById(id: string) {
    return User.findById(id).select("-password -passwordHash");
}

export async function updateUserById(id: string, update: any) {
    const allowedFields = ["firstName", "lastName", "role", "updatedBy"];
    const safeUpdate: Record<string, any> = {};

    for (const field of allowedFields) {
        if (update[field] !== undefined) safeUpdate[field] = update[field];
    }

    return User.findByIdAndUpdate(id, safeUpdate, {
        new: true,
        runValidators: true,
    }).select("-password -passwordHash");
}

export async function deleteUserById(id: string) {
    return User.findByIdAndDelete(id);
}
