/**
 * Parses a duration string (e.g. "7d", "2w", "15m", "2h", "30s") into milliseconds.
 * Supported units: w (weeks), d (days), h (hours), m (minutes), s (seconds).
 * Throws if the value is not a number or the unit is unrecognised.
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
