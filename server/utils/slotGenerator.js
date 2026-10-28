// Shared OPD slot engine. Date and time are treated as hospital wall-clock values
// and anchored to UTC so the selected calendar day can never shift by timezone.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUTES_PER_DAY = 1440;

const parseTimeToMinutes = (value) => {
    const text = String(value || '').trim();
    if (text === '24:00') return MINUTES_PER_DAY;

    const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour < 1 || hour > 12 || minute > 59) return null;
        // 12 AM is minute 0 and 12 PM is minute 720. The modulo is what prevents
        // the classic bug where 12 is incorrectly promoted to 24.
        return ((hour % 12) + (/pm/i.test(match[3]) ? 12 : 0)) * 60 + minute;
    }

    const match24 = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match24 ? Number(match24[1]) * 60 + Number(match24[2]) : null;
};

const formatMinutes = (total) => {
    const normalized = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const hour24 = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${String(hour24 % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
};

// Strict YYYY-MM-DD parsing. Date.UTC silently normalizes invalid days such as
// 2026-02-31, so round-trip comparison is required to reject them.
const parseCalendarDate = (dateStr) => {
    const match = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }
    return { year, month, day };
};

const getDayName = (dateStr) => {
    const parts = parseCalendarDate(dateStr);
    if (!parts) return null;
    return DAY_NAMES[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
};

// Absolute minute offset from midnight of the selected date. Date.UTC rolls into
// the next day/month/year only when the shift genuinely crosses midnight.
const toSlotDate = (parts, absoluteMinutes) =>
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, absoluteMinutes));

// Duration in minutes, adding 24h when the end clock is earlier than the start.
// Returns 0 for invalid or zero-length shifts so callers can reject them cleanly.
const getShiftDurationMinutes = (start, end) => {
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return 0;
    return (endMinutes - startMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
};

// Emits windows with authoritative start/end instants. If end is earlier than
// start the shift is treated as overnight, so 12:00 AM lands on the next day.
const generateSlotWindows = ({ date, start, end, duration = 30 }) => {
    const parts = parseCalendarDate(date);
    const startMinutes = parseTimeToMinutes(start);
    const shiftMinutes = getShiftDurationMinutes(start, end);
    if (!parts || startMinutes === null || duration <= 0 || shiftMinutes === 0) return [];

    const endAbsolute = startMinutes + shiftMinutes;
    const windows = [];
    for (let cursor = startMinutes; cursor + duration <= endAbsolute; cursor += duration) {
        windows.push({
            slot: formatMinutes(cursor),
            startAt: toSlotDate(parts, cursor),
            endAt: toSlotDate(parts, cursor + duration),
            dayOffset: Math.floor(cursor / MINUTES_PER_DAY) // 1 = slot belongs to the next calendar day
        });
    }
    return windows;
};

// Backward-compatible string-only helper for callers that do not need timestamps.
const generateTimeSlots = (options) => generateSlotWindows(options).map(window => window.slot);

module.exports = {
    parseTimeToMinutes,
    formatMinutes,
    parseCalendarDate,
    getDayName,
    getShiftDurationMinutes,
    generateSlotWindows,
    generateTimeSlots
};
