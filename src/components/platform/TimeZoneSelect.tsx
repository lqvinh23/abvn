"use client";

import { useMemo } from "react";
import { timeZoneOptionLabel } from "@/src/lib/platform/calendar";
import { timeZoneNames } from "@/src/lib/platform/time-zones";
import { Select } from "./Fields";

// Offsets are shown for the supplied moment so daylight saving is reflected; the fallback keeps server and client output identical.
const referenceTime = Date.UTC(2026, 0, 15);

export default function TimeZoneSelect({ label = "Time zone", name = "time_zone", defaultValue, value, onValueChange, compact = true, required = true, disabled, now = referenceTime }: {
  label?: string; name?: string; defaultValue?: string; value?: string; onValueChange?: (value: string) => void;
  compact?: boolean; required?: boolean; disabled?: boolean; now?: number;
}) {
  const current = value ?? defaultValue ?? "";
  const zones = useMemo(() => current && !timeZoneNames.includes(current) ? [current, ...timeZoneNames] : timeZoneNames, [current]);
  return <Select compact={compact} label={label} name={name} required={required} disabled={disabled} value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
    {zones.map(zone => <option key={zone} value={zone}>{timeZoneOptionLabel(zone, now)}</option>)}
  </Select>;
}
