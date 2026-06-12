import "dotenv/config";

function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

export const env = {
    DATABASE_URL: required("DATABASE_URL"),
    REDIS_URL: required("REDIS_URL"),
    JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
    JWT_ACCESS_EXPIRATION: required("JWT_ACCESS_EXPIRATION"),
    JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
    JWT_REFRESH_EXPIRATION: required("JWT_REFRESH_EXPIRATION"),
    GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
    TOKEN_EXPIRATION_TIME: required("TOKEN_EXPIRATION_TIME"),
    RESEND_API_KEY: required("RESEND_API_KEY"),
    FROM_EMAIL: required("FROM_EMAIL"),
    NODE_ENV: required("NODE_ENV"),
    PORT: required("PORT"),
    FRONTEND_URL: required("FRONTEND_URL"),
    AWS_ACCESS_KEY_ID: required("AWS_ACCESS_KEY_ID"),
    AWS_SECRET_ACCESS_KEY: required("AWS_SECRET_ACCESS_KEY"),
    AWS_REGION: required("AWS_REGION"),
    S3_BUCKET: required("S3_BUCKET"),
};