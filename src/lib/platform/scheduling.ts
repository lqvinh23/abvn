import { DateTime, IANAZone } from "luxon";

export function isValidTimeZone(zone: string) {
  return zone.length <= 100 && IANAZone.isValidZone(zone);
}

export function localLessonToUtc(
  localStart: string,
  zone: string,
  minutes: number,
) {
  if (!isValidTimeZone(zone)) throw new Error("Choose a valid IANA time zone.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStart)) {
    throw new Error("Choose a valid lesson date and time.");
  }
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 120)
    throw new Error("Choose a whole-minute duration between 30 and 120 minutes.");
  const start = DateTime.fromISO(localStart, { zone });
  if (!start.isValid || start.toFormat("yyyy-MM-dd'T'HH:mm") !== localStart) {
    throw new Error(
      "This local time does not exist because the clocks change. Choose another time.",
    );
  }
  if (start.getPossibleOffsets().length > 1) {
    throw new Error(
      "This local time occurs twice because the clocks change. Choose an unambiguous time.",
    );
  }
  const end = start.plus({ minutes });
  return { startsAt: start.toUTC().toISO()!, endsAt: end.toUTC().toISO()! };
}

export function formatLessonTime(iso: string, zone: string) {
  const value = DateTime.fromISO(iso, { zone });
  if (!value.isValid)
    throw new Error("The lesson time or time zone is invalid.");
  return value.toFormat("ccc, d LLL yyyy · HH:mm ZZZZ");
}

export function isAllowedMeetingUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ([
        "meet.google.com",
        "teams.microsoft.com",
        "join.skype.com",
        "zoom.us",
      ].includes(url.hostname) ||
        /^[a-z0-9-]+\.zoom\.us$/.test(url.hostname)) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}
