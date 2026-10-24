"use client";

import { useState } from "react";
import ActionForm from "./ActionForm";
import { Field, TextArea } from "./Fields";
import DurationField from "./DurationField";
import TimeZoneSelect from "./TimeZoneSelect";
import { createSlot } from "@/src/app/dashboard/actions";
import {
  formatLessonTime,
  localLessonToUtc,
} from "@/src/lib/platform/scheduling";

export default function AvailabilityForm({ timeZone, initialStart = "" }: { timeZone: string; initialStart?: string }) {
  const [start, setStart] = useState(initialStart);
  const [duration, setDuration] = useState(60);
  const [zone, setZone] = useState(timeZone);
  let preview: { local: string; vietnam: string; end: string } | null = null;
  let validationMessage = "";
  if (start) {
    try {
      const dates = localLessonToUtc(start, zone, duration);
      preview = {
        local: formatLessonTime(dates.startsAt, zone),
        vietnam: formatLessonTime(dates.startsAt, "Asia/Ho_Chi_Minh"),
        end: formatLessonTime(dates.endsAt, zone),
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      validationMessage = error.message;
    }
  }
  return (
    <ActionForm
      action={createSlot}
      submitLabel="Publish lesson time"
      disabled={!preview}
    >
      <Field label="Class title" name="title" defaultValue="English conversation" required maxLength={120} />
      <TextArea label="What will you practise together? (optional)" name="description" rows={3} maxLength={2000} />
      <TimeZoneSelect compact={false} label="Your time zone" value={zone} onValueChange={setZone} />
      <p className="text-sm leading-6 text-slate-600">
        Use a region such as America/New_York, Europe/London, or
        Asia/Ho_Chi_Minh. Daylight saving is handled automatically.
      </p>
      <Field
        label="Date and start time in your time zone"
        name="start"
        type="datetime-local"
        value={start}
        onChange={(event) => setStart(event.target.value)}
        required
      />
      <DurationField label="Lesson length" initialValue={60} onValueChange={setDuration} />
      <Field
        label="Classroom link (Google Meet, Zoom, Teams, or Skype)"
        name="meeting_url"
        type="url"
        required
        maxLength={1000}
        placeholder="https://meet.google.com/abc-defg-hij"
      />
      <p className="text-sm leading-6 text-slate-600">
        Create a real meeting in your chosen service and paste its link. ABVN
        does not create video meetings automatically. Only booked participants
        receive the link.
      </p>
      {validationMessage ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">
          {validationMessage}
        </p>
      ) : null}
      {preview ? (
        <div
          aria-live="polite"
          className="rounded-xl bg-green-50 p-5 text-base leading-7 text-green-950"
        >
          <p className="font-semibold">Confirm your lesson time</p>
          <p>Your start: {preview.local}</p>
          <p>Your end: {preview.end}</p>
          <p>Vietnam start: {preview.vietnam}</p>
          <p className="mt-2 text-sm">
            Times are stored in UTC. Check both time zones before publishing.
          </p>
        </div>
      ) : null}
    </ActionForm>
  );
}
