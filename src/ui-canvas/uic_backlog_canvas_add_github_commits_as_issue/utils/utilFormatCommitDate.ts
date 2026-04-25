/**
 * Formats an arbitrary date string into the canonical YYYY-MM-DDTHH:mm:ss
 * format used throughout the backlog system for closedDate consistency.
 *
 * Returns the provided `fallback` string if parsing fails or input is empty.
 *
 * Pure function — no React, no Firebase, no API dependency.
 *
 * @example
 * formatCommitDate('2024-03-15T10:30:00Z', now) // → '2024-03-15T10:30:00'
 */
export const formatCommitDate = (dateStr: string, fallback: string): string => {
    if (!dateStr || dateStr === fallback) return fallback;

    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return fallback;

        const pad = (n: number) => n.toString().padStart(2, '0');
        return (
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
            `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        );
    } catch {
        return fallback;
    }
};
