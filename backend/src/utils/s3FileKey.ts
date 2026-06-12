import path from "path";
import crypto from "crypto";

export function generateFileKey(
    userId: string,
    originalFileName: string
) {
    const ext = path.extname(originalFileName);

    const randomId = crypto.randomUUID();

    return `users/${userId}/${randomId}${ext}`;
}