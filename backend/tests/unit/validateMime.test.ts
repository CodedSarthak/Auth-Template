import { describe, it, expect } from "vitest";
import {
    validateMimeType,
    validateFileSize,
    validateFileUpload,
} from "../../src/utils/validateMime.js";
import { BadRequestException } from "../../src/errors/errors.js";

describe("validateMimeType", () => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const disallowed = ["image/gif", "video/mp4", "text/plain", "application/json", "image/bmp"];

    it.each(allowed)("accepts allowed type: %s", (mimeType) => {
        expect(() => validateMimeType(mimeType)).not.toThrow();
    });

    it.each(disallowed)("rejects disallowed type: %s with BadRequestException", (mimeType) => {
        expect(() => validateMimeType(mimeType)).toThrow(BadRequestException);
    });

    it("error message includes the rejected type name", () => {
        try {
            validateMimeType("image/gif");
        } catch (e: any) {
            expect(e.message).toContain("image/gif");
        }
    });
});

describe("validateFileSize", () => {
    const MAX_IMG = 5 * 1024 * 1024;   // 5 MB
    const MAX_PDF = 20 * 1024 * 1024;  // 20 MB

    it("accepts image at exactly the 5 MB limit", () => {
        expect(() => validateFileSize("image/jpeg", MAX_IMG)).not.toThrow();
    });

    it("rejects image one byte over the 5 MB limit", () => {
        expect(() => validateFileSize("image/jpeg", MAX_IMG + 1)).toThrow();
    });

    it("rejects PNG over 5 MB", () => {
        expect(() => validateFileSize("image/png", MAX_IMG + 1024)).toThrow();
    });

    it("accepts PDF at exactly the 20 MB limit", () => {
        expect(() => validateFileSize("application/pdf", MAX_PDF)).not.toThrow();
    });

    it("rejects PDF one byte over 20 MB", () => {
        expect(() => validateFileSize("application/pdf", MAX_PDF + 1)).toThrow();
    });

    it("does not restrict size for an unknown mime type (no matching category)", () => {
        // validateFileSize only checks size for image/* and application/pdf
        // An unrecognised type that slipped through validateMimeType is silently ignored
        expect(() => validateFileSize("image/gif", 100 * 1024 * 1024)).not.toThrow();
    });
});

describe("validateFileUpload", () => {
    it("throws BadRequestException for an invalid mime type regardless of size", () => {
        expect(() => validateFileUpload("image/gif", 100)).toThrow(BadRequestException);
    });

    it("throws for valid mime type but file too large", () => {
        expect(() => validateFileUpload("image/jpeg", 10 * 1024 * 1024)).toThrow();
    });

    it("passes for valid mime type and acceptable size", () => {
        expect(() => validateFileUpload("image/png", 1024)).not.toThrow();
    });

    it("passes for PDF within 20 MB", () => {
        expect(() => validateFileUpload("application/pdf", 5 * 1024 * 1024)).not.toThrow();
    });
});
