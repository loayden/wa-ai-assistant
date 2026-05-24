export const WORKING_DAY_KEYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type WorkingDayKey = (typeof WORKING_DAY_KEYS)[number];

export const ARAB_WORKING_DAY_LABELS: Record<WorkingDayKey, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

export const ARAB_TIMEZONES = [
  { value: "Africa/Cairo", label: "مصر" },
  { value: "Asia/Riyadh", label: "السعودية" },
  { value: "Asia/Dubai", label: "الإمارات" },
  { value: "Asia/Kuwait", label: "الكويت" },
  { value: "Africa/Tripoli", label: "ليبيا" },
] as const;

export type WorkingHoursConfig = {
  workingHoursEnabled?: boolean | null;
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  workingDays?: string[] | null;
  timezone?: string | null;
};

function parseTimeToMinutes(value: string | null | undefined) {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getZonedDate(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return new Date(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
  } catch {
    return now;
  }
}

export function isWithinWorkingHours(config: WorkingHoursConfig, now = new Date()) {
  if (!config.workingHoursEnabled) {
    return true;
  }

  const timezone = config.timezone || "Africa/Cairo";
  const zonedNow = getZonedDate(now, timezone);
  const day = zonedNow.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const workingDays = config.workingDays?.length ? config.workingDays : [];

  const startMinutes = parseTimeToMinutes(config.workingHoursStart || "09:00");
  const endMinutes = parseTimeToMinutes(config.workingHoursEnd || "22:00");

  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  if (startMinutes === endMinutes) {
    return true;
  }

  const nowMinutes = zonedNow.getHours() * 60 + zonedNow.getMinutes();

  if (startMinutes < endMinutes) {
    if (!workingDays.includes(day)) {
      return false;
    }

    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  if (workingDays.includes(day) && nowMinutes >= startMinutes) {
    return true;
  }

  const previousLocalDay = new Date(zonedNow);
  previousLocalDay.setDate(zonedNow.getDate() - 1);
  const previousDay = previousLocalDay.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  return workingDays.includes(previousDay) && nowMinutes < endMinutes;
}
