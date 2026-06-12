import crypto from "crypto";

export const generateRandomToken = (bytes: number = 32): string => {
    return crypto.randomBytes(bytes).toString("hex");
};

