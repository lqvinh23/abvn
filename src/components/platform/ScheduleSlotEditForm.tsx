"use client";

import { DateTime } from "luxon";
import type { ActionResult } from "@/src/lib/platform/types";
import ActionForm from "./ActionForm";
import DurationField from "./DurationField";
import { Field, TextArea } from "./Fields";

type SlotEditAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;

export default function ScheduleSlotEditForm({
  action,
  slotId,
  slotType,
  title,
  description,
  startsAt,
  endsAt,
  meetingUrl,
  timeZone,
  booked,
}: {
  action: SlotEditAction;
  slotId: string;
  slotType: "lesson" | "interview";
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  meetingUrl: string;
  timeZone: string;
  booked: boolean;
}) {
  const localStart = DateTime.fromISO(startsAt).setZone(timeZone);
  if (!localStart.isValid) throw new Error("The slot time or time zone is invalid.");
  const initialStart = localStart.toFormat("yyyy-MM-dd'T'HH:mm");
  const duration = DateTime.fromISO(endsAt).diff(DateTime.fromISO(startsAt), "minutes").minutes;
  if (!Number.isInteger(duration)) throw new Error("The slot duration is invalid.");

  return <ActionForm
    action={action}
    submitLabel={`Save ${slotType} changes`}
    preserveOnError
    beforeSubmit={form => {
      if (!booked) return true;
      const startChanged = (form.elements.namedItem("start") as HTMLInputElement).value !== initialStart;
      const durationChanged = Number((form.elements.namedItem("duration") as HTMLInputElement | null)?.value ?? duration) !== duration;
      return !startChanged && !durationChanged || window.confirm(
        `This ${slotType} is booked. Contact the ${slotType === "lesson" ? "student" : "interviewee"} first. Saving will notify them in the ABVN system; email notifications are not available yet. Do you want to change the schedule?`,
      );
    }}
  >
    <input type="hidden" name="slot_id" value={slotId} />
    <input type="hidden" name="time_zone" value={timeZone} />
    <Field compact label={`${slotType === "lesson" ? "Class" : "Interview"} title`} name="title" defaultValue={title} required maxLength={120} />
    <TextArea compact label="Description (optional)" name="description" defaultValue={description} rows={3} maxLength={2000} />
    <Field compact label="Start date and time" name="start" type="datetime-local" defaultValue={initialStart} required />
    <DurationField compact label="Duration" initialValue={duration} />
    <p className="text-xs text-slate-500">Times use {timeZone}. Booked participants receive an in-app notice if the start time or duration changes.</p>
    <Field compact label="Meeting link" name="meeting_url" type="url" defaultValue={meetingUrl} required maxLength={2000} />
  </ActionForm>;
}
