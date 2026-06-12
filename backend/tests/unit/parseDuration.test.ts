import { describe, it, expect } from "vitest";
import { parseDurationMs } from "../../src/utils/parseDuration.js";

describe("parseDurationMs", () => {

    describe("valid duration strings", () => {
        it("parses days: '7d'", () => {
            expect(parseDurationMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
        });

        it("parses days: '1d'", () => {
            expect(parseDurationMs("1d")).toBe(24 * 60 * 60 * 1000);
        });

        it("parses hours: '2h'", () => {
            expect(parseDurationMs("2h")).toBe(2 * 60 * 60 * 1000);
        });

        it("parses hours: '24h'", () => {
            expect(parseDurationMs("24h")).toBe(24 * 60 * 60 * 1000);
        });

        it("parses minutes: '15m'", () => {
            expect(parseDurationMs("15m")).toBe(15 * 60 * 1000);
        });

        it("parses minutes: '1m'", () => {
            expect(parseDurationMs("1m")).toBe(60 * 1000);
        });

        it("parses seconds: '30s'", () => {
            expect(parseDurationMs("30s")).toBe(30 * 1000);
        });

        it("falls back to raw ms for bare number string", () => {
            expect(parseDurationMs("1000")).toBe(1000);
        });

        it("falls back to raw ms for unknown suffix", () => {
            // 'w' is not a handled unit → falls through to default
            expect(parseDurationMs("1w")).toBe(1);
        });
    });

    describe("edge cases", () => {
        it("throws for non-numeric string", () => {
            expect(() => parseDurationMs("xyz")).toThrow("Invalid duration string");
        });

        it("throws for empty string", () => {
            expect(() => parseDurationMs("")).toThrow("Invalid duration string");
        });

        it("handles '0d' → 0ms", () => {
            expect(parseDurationMs("0d")).toBe(0);
        });
    });
});
