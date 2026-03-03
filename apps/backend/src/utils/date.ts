/**
 * Formats a date to the required ERP format: YYYY-MM-DD HH:mm:ss.SSS
 * Example: 2026-02-12 00:00:00.000
 */
export function formatDateForERP(date?: Date): string {
    const d = date || new Date();

    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');

    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const SSS = String(d.getMilliseconds()).padStart(3, '0');

    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${SSS}`;
}
