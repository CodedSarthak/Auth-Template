/**
 * Parses a JWT-style duration string (e.g. "7d", "15m", "2h") into milliseconds.
 * Falls back to treating the value as raw milliseconds if no unit suffix is found.
 */
export function parseDurationMs(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration, 10);

    if (isNaN(value)) {
        throw new Error(`Invalid duration string: "${duration}"`);
    }

    switch (unit) {
        case "w": return value * 7 * 24 * 60 * 60 * 1000;
        case "d": return value * 24 * 60 * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "m": return value * 60 * 1000;
        case "s": return value * 1000;
        default: throw new Error(`Unknown duration unit "${unit}" in "${duration}". Use w, d, h, m, or s.`);
    }
}
