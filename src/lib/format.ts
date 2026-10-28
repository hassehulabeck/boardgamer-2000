// All dates are shown in Swedish time, whatever the phone or server is set to, so server
// rendering and the browser always agree.
export const TIME_ZONE = 'Europe/Stockholm';

const timeFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit'
});
const dayFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: TIME_ZONE,
	weekday: 'short',
	day: 'numeric',
	month: 'short'
});
const isoDateFormat = new Intl.DateTimeFormat('sv-SE', {
	timeZone: TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** "12:05" */
export function formatTime(date: Date): string {
	return timeFormat.format(date);
}

/** "Mon 28 Oct" */
export function formatDay(date: Date): string {
	return dayFormat.format(date);
}

/** "2026-10-28" in Swedish time; used to group sessions by day. */
export function dayKey(date: Date): string {
	return isoDateFormat.format(date);
}

/** "Today", "Yesterday" or "Mon 28 Oct". */
export function formatRelativeDay(date: Date, now = new Date()): string {
	const key = dayKey(date);
	if (key === dayKey(now)) return 'Today';
	if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
	return formatDay(date);
}

/** "47 min" or "1 h 05 min" */
export function formatDuration(ms: number): string {
	const minutes = Math.max(0, Math.round(ms / 60000));
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "12:34" or "1:02:34", for the running clock. */
export function formatClock(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * Turns a Swedish wall-clock time on a given day into a Date. Handles summer time by
 * measuring the zone's offset at that moment.
 */
export function stockholmTime(day: string, time: string): Date | null {
	const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
	const t = /^(\d{1,2}):(\d{2})$/.exec(time);
	if (!d || !t) return null;
	const asUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
	if (+t[1] > 23 || +t[2] > 59 || Number.isNaN(asUtc)) return null;
	// Offset of Stockholm from UTC around that time (+1 h in winter, +2 h in summer).
	const offset = zoneOffsetMs(new Date(asUtc));
	const result = new Date(asUtc - offset);
	// Re-check once in case the guess crossed a daylight-saving change.
	return new Date(asUtc - zoneOffsetMs(result));
}

function zoneOffsetMs(date: Date): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: TIME_ZONE,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
	return wall - Math.floor(date.getTime() / 1000) * 1000;
}

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'short' });

/** Monday first, as in Sweden. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 0 = Monday … 6 = Sunday, in Swedish time. */
export function weekdayIndex(date: Date): number {
	return WEEKDAYS.indexOf(weekdayFormat.format(date));
}

/** "0.8 h", "12 h": one decimal for short totals, whole hours once it adds up. */
export function formatHours(ms: number): string {
	const hours = ms / 3_600_000;
	return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
}

/** "42%" */
export function formatPercent(part: number, total: number): string {
	return total === 0 ? '–' : `${Math.round((part / total) * 100)}%`;
}
