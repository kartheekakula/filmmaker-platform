// Date utilities for Arkee
// Timezone: Asia/Kolkata (IST). One date format everywhere: 1 Nov 2026.

/**
 * Returns today's date in IST formatted as YYYY-MM-DD.
 */
export function todayIST(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Parses an ISO date string or Date object safely in IST and returns "1 Nov 2026".
 */
export function formatDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return "";

  let d: Date;
  if (typeof isoDate === "string") {
    // If it's pure YYYY-MM-DD, parse year, month, day to avoid UTC midnight shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [year, month, day] = isoDate.split("-").map(Number);
      d = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      d = new Date(isoDate);
    }
  } else {
    d = isoDate;
  }

  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value.replace(/^0/, "");
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;

  if (!day || !month || !year) {
    return "";
  }

  return `${day} ${month} ${year}`;
}

/**
 * Formats a date range into e.g. "12 to 14 Feb 2027", "28 Feb to 2 Mar 2027", or "12 Feb 2027".
 */
export function formatDateRange(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): string {
  if (!startDateStr && !endDateStr) return "";
  if (!startDateStr) return formatDate(endDateStr);
  if (!endDateStr || startDateStr === endDateStr) return formatDate(startDateStr);

  const startFormatted = formatDate(startDateStr);
  const endFormatted = formatDate(endDateStr);

  const startParts = startFormatted.split(" ");
  const endParts = endFormatted.split(" ");

  if (startParts.length === 3 && endParts.length === 3) {
    const [startDay, startMonth, startYear] = startParts;
    const [endDay, endMonth, endYear] = endParts;

    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} to ${endDay} ${endMonth} ${endYear}`;
    }
    if (startYear === endYear) {
      return `${startDay} ${startMonth} to ${endDay} ${endMonth} ${endYear}`;
    }
  }

  return `${startFormatted} to ${endFormatted}`;
}

/**
 * Returns number of days left until the deadline in IST.
 * A deadline is valid through the end of that day in IST (23:59:59.999).
 * Returns >= 0 if unexpired, negative if expired.
 */
export function daysLeft(isoDate: string | Date | null | undefined): number {
  if (!isoDate) return -1;

  const currentToday = todayIST(); // YYYY-MM-DD
  const [ty, tm, td] = currentToday.split("-").map(Number);
  const todayStart = Date.UTC(ty, tm - 1, td);

  let targetDateStr: string;
  if (typeof isoDate === "string") {
    targetDateStr = isoDate.split("T")[0];
  } else {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    targetDateStr = formatter.format(isoDate);
  }

  const [y, m, d] = targetDateStr.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return -1;

  const targetStart = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Checks if a date has already passed in IST.
 */
export function isExpired(isoDate: string | Date | null | undefined): boolean {
  return daysLeft(isoDate) < 0;
}
