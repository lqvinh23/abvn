import { DateTime } from "luxon";
import type { ScheduleChangeNotification } from "@/src/lib/platform/types";
import { markScheduleChangeRead } from "@/src/app/dashboard/actions";
import ActionForm from "./ActionForm";

export default function ScheduleChangeInbox({
  notifications,
  timeZone,
  unavailable = false,
}: {
  notifications: ScheduleChangeNotification[];
  timeZone: string;
  unavailable?: boolean;
}) {
  return <section aria-labelledby="schedule-changes-title" className="space-y-3">
    <h2 id="schedule-changes-title" className="text-lg font-semibold">Schedule change notifications</h2>
    {unavailable ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">In-app schedule notifications are not enabled yet. Apply migration 202610230019_slot_edit_notifications.sql to enable them.</p> :
      notifications.length ? notifications.map(notification => {
        const previous = DateTime.fromISO(notification.previous_starts_at).setZone(timeZone);
        const next = DateTime.fromISO(notification.starts_at).setZone(timeZone);
        const previousEnd = DateTime.fromISO(notification.previous_ends_at).setZone(timeZone);
        const nextEnd = DateTime.fromISO(notification.ends_at).setZone(timeZone);
        return <article key={notification.id} className={`rounded-xl border p-4 ${notification.read_at ? "border-slate-200 bg-white" : "border-green-200 bg-green-50/60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{notification.slot_type === "lesson" ? "Lesson" : "Interview"} updated: {notification.slot_title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {previous.toFormat("ccc, d LLL yyyy · HH:mm")}–{previousEnd.toFormat("HH:mm")} <span aria-label="changed to">→</span> {next.toFormat("ccc, d LLL yyyy · HH:mm")}–{nextEnd.toFormat("HH:mm")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Times shown in {timeZone}. Updated {DateTime.fromISO(notification.created_at).setZone(timeZone).toFormat("d LLL yyyy · HH:mm")}.</p>
            </div>
            {notification.read_at ? <span className="text-xs font-medium text-slate-500">Read</span> :
              <ActionForm action={markScheduleChangeRead} submitLabel="Mark as read" preserveOnError>
                <input type="hidden" name="notification_id" value={notification.id} />
              </ActionForm>}
          </div>
        </article>;
      }) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No schedule changes have been sent to you.</p>}
  </section>;
}
