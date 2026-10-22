"use client";

import { useState } from "react";
import { Field, Select } from "./Fields";

export default function DurationField({ label = "Duration", initialValue = 30, onValueChange, compact = false }: {
  label?: string; initialValue?: number; onValueChange?: (minutes: number) => void; compact?: boolean;
}) {
  const [choice, setChoice] = useState([30,45,60].includes(initialValue) ? String(initialValue) : "custom");
  const [custom, setCustom] = useState(String(initialValue));
  return <div className="space-y-3">
    <Select compact={compact} label={label} name={choice === "custom" ? undefined : "duration"} value={choice} onValueChange={value => {
      setChoice(value);
      onValueChange?.(Number(value === "custom" ? custom : value));
    }}>
      {[30,45,60].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
      <option value="custom">Other duration...</option>
    </Select>
    {choice === "custom" ? <Field compact={compact} label="Duration in minutes (30-120)" name="duration" type="number" min={30} max={120} step={1} value={custom} required onChange={event => {
      setCustom(event.target.value); onValueChange?.(Number(event.target.value));
    }} /> : null}
  </div>;
}
