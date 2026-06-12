export const FILE_CONFIG = {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    MAX_PDF_SIZE: 20 * 1024 * 1024,

    ALLOWED_IMAGE_TYPES: [
        "image/jpeg",
        "image/png",
        "image/webp",
    ],

    ALLOWED_DOCUMENT_TYPES: [
        "application/pdf",
    ],

    PRESIGNED_URL_EXPIRY: 60 * 5,
};

export const ALL_ALLOWED_MIME_TYPES = [
    ...FILE_CONFIG.ALLOWED_IMAGE_TYPES,
    ...FILE_CONFIG.ALLOWED_DOCUMENT_TYPES,
]