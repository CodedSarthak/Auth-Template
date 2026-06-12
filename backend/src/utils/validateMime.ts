import {
    FILE_CONFIG,
    ALL_ALLOWED_MIME_TYPES,
} from "../constants/s3.fileConstants.js";

export function validateMimeType(
    mimeType: string
): void {
    if (
        !ALL_ALLOWED_MIME_TYPES.includes(
            mimeType as (typeof ALL_ALLOWED_MIME_TYPES)[number]
        )
    ) {
        throw new Error(
            `Unsupported file type: ${mimeType}`
        );
    }
}

export function validateFileSize(
    mimeType: string,
    fileSize: number
): void {
    const isImage =
        FILE_CONFIG.ALLOWED_IMAGE_TYPES.includes(
            mimeType as (typeof FILE_CONFIG.ALLOWED_IMAGE_TYPES)[number]
        );

    const isDocument =
        FILE_CONFIG.ALLOWED_DOCUMENT_TYPES.includes(
            mimeType as (typeof FILE_CONFIG.ALLOWED_DOCUMENT_TYPES)[number]
        );

    if (
        isImage &&
        fileSize > FILE_CONFIG.MAX_IMAGE_SIZE
    ) {
        throw new Error(
            "Image size exceeds 5 MB limit"
        );
    }

    if (
        isDocument &&
        fileSize > FILE_CONFIG.MAX_PDF_SIZE
    ) {
        throw new Error(
            "PDF size exceeds 20 MB limit"
        );
    }
}

export function validateFileUpload(
    mimeType: string,
    fileSize: number
): void {
    validateMimeType(mimeType);
    validateFileSize(mimeType, fileSize);
}