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
        case "d": return value * 24 * 60 * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "m": return value * 60 * 1000;
        case "s": return value * 1000;
        default:  return value;
    }
}
