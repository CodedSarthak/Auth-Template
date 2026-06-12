import {
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3Client } from "../config/aws-s3.js";
import { env } from "../config/getEnvVars.js";

import { FILE_CONFIG } from "../constants/s3.fileConstants.js";

export function createPutObjectCommand(
    fileKey: string,
    mimeType: string
) {
    return new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey,
        ContentType: mimeType,
    });
}

export function createGetObjectCommand(
    fileKey: string
) {
    return new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey,
        ResponseContentDisposition: "attachment",
    });
}

export async function generateUploadPresignedUrl(
    fileKey: string,
    mimeType: string
) {
    const uploadUrl = await getSignedUrl(
        s3Client,
        createPutObjectCommand(
            fileKey,
            mimeType
        ),
        {
            expiresIn: FILE_CONFIG.PRESIGNED_URL_EXPIRY,
        }
    );

    return {
        uploadUrl,
        fileKey,
        expiresIn: FILE_CONFIG.PRESIGNED_URL_EXPIRY,
    };
}

export async function generateDownloadPresignedUrl(
    fileKey: string
) {
    const downloadUrl = await getSignedUrl(
        s3Client,
        createGetObjectCommand(fileKey),
        {
            expiresIn: FILE_CONFIG.PRESIGNED_URL_EXPIRY,
        }
    );

    return {
        downloadUrl,
        expiresIn: FILE_CONFIG.PRESIGNED_URL_EXPIRY,
    };
}

export async function checkObjectExists(fileKey: string): Promise<boolean> {
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: fileKey,
        }));
        return true;
    } catch (error) {
        return false;
    }
}

export async function deleteObject(fileKey: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey,
    }));
}