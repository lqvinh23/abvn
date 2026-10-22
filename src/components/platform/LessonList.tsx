import ActionForm from "./ActionForm";
import { Select, TextArea } from "./Fields";
import { cancelLesson, submitFeedback } from "@/src/app/dashboard/actions";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { attendanceLabels, getLessonDisplayStatus, lessonStatuses } from "@/src/lib/platform/dashboard";
import type { CalendarLesson, Role } from "@/src/lib/platform/types";
import ActionIcon from "./ActionIcon";

export default function LessonList({
  lessons,
  role,
  timeZone,
  now,
  compact = false,
  hideOverview = false,
  readOnly = false,
  hideCancelAction = false,
}: {
  lessons: CalendarLesson[];
  role: Role;
  timeZone: string;
  now: number;
  compact?: boolean;
  hideOverview?: boolean;
  readOnly?: boolean;
  hideCancelAction?: boolean;
}) {
  const upcoming = lessons
    .filter(
      (lesson) =>
        Date.parse(lesson.ends_at) > now &&
        lesson.slot_status !== "cancelled" &&
        lesson.booking_status !== "cancelled",
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const history = lessons.filter((lesson) => !upcoming.includes(lesson));
  return (
    <div className="space-y-10">
      {(compact ? [{ title: "Lesson details", items: lessons }] : [
        { title: "Upcoming lessons & availability", items: upcoming },
        { title: "Lesson history & feedback", items: history },
      ]).map(({ title, items }) => (
        <section key={title} aria-label={title}>
          {!compact ? <h2 className="text-2xl font-semibold text-slate-950">{title}</h2> : null}
          {items.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-base text-slate-600">
              No lessons to show yet.
            </p>
          ) : null}
          <div className={compact ? "grid gap-5" : "mt-5 grid gap-5 xl:grid-cols-2"}>
            {items.map((lesson) => {
              const display = lessonStatuses[getLessonDisplayStatus(lesson, now)];
              const cancelled =
                lesson.slot_status === "cancelled" ||
                lesson.booking_status === "cancelled";
              const ended = Date.parse(lesson.ends_at) <= now;
              const canCancel =
                !readOnly &&
                !cancelled &&
                Date.parse(lesson.starts_at) > now &&
                (role !== "student" ||
                  Date.parse(lesson.starts_at) - now > 12 * 60 * 60 * 1000);
              return (
                <article
                  key={lesson.booking_id ?? lesson.slot_id}
                  className={hideOverview ? "space-y-3" : "rounded-2xl border border-slate-200 bg-white p-6"}
                >
                  {!hideOverview ? <>
                  <p className={`inline-flex rounded-full border px-3 py-2 text-sm font-semibold ${display.color}`}>
                    {display.label}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">
                    {lesson.title}
                  </h3>
                  <p className="mt-2 text-base font-medium text-slate-800">
                    {role === "student"
                      ? `With ${lesson.teacher_name}`
                      : lesson.student_name
                        ? `With ${lesson.student_name}`
                        : "Open for a student"}
                  </p>
                  {role === "admin" ? (
                    <p className="mt-2 text-base text-slate-700">
                      Teacher: {lesson.teacher_name}
                    </p>
                  ) : null}
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {formatLessonTime(lesson.starts_at, timeZone)}
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    Ends: {formatLessonTime(lesson.ends_at, timeZone)}
                  </p>
                  {timeZone !== "Asia/Ho_Chi_Minh" ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Vietnam:{" "}
                      {formatLessonTime(lesson.starts_at, "Asia/Ho_Chi_Minh")}
                    </p>
                  ) : null}
                  {lesson.attendance ? (
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Student attendance: {attendanceLabels[lesson.attendance]}
                    </p>
                  ) : null}
                  </> : lesson.attendance ? <p className="text-base text-slate-700">Student attendance: <strong className="font-semibold">{attendanceLabels[lesson.attendance]}</strong></p> : null}
                  {lesson.attendance === "cancelled" ? <p className="mt-3 rounded-lg bg-purple-50 p-3 text-sm leading-6 text-purple-950">Recorded as a teacher-side cancellation. This booking does not count towards a student weekly class limit, and the time is not reopened. Weekly limit enforcement is not enabled yet.</p> : null}
                  {!readOnly && !cancelled &&
                  !ended &&
                  lesson.meeting_url &&
                  lesson.booking_id ? (
                    <a
                      href={lesson.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-800 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
                    >
                      <ActionIcon name="video" />
                      Join class
                      <ActionIcon name="external" />
                    </a>
                  ) : null}
                  {canCancel && !hideCancelAction ? (
                    <details className="mt-4">
                      <summary className="min-h-11 cursor-pointer py-2 text-base font-medium text-red-800">
                        Cancel this{" "}
                        {lesson.booking_id ? "lesson" : "available time"}
                      </summary>
                      <p className="mb-3 text-sm leading-6 text-slate-600">
                        {role === "student"
                          ? "Cancelling releases this time for another student. This cannot be undone."
                          : lesson.booking_id
                            ? "This cancels the booked lesson and keeps its history. Contact your student separately."
                            : "If no student has ever booked this time, it will be permanently deleted. If it has booking history, that record is kept."}
                      </p>
                      <ActionForm
                        action={cancelLesson}
                        submitLabel="Confirm cancellation"
                      >
                        <input
                          type="hidden"
                          name="slot_id"
                          value={lesson.slot_id}
                        />
                      </ActionForm>
                    </details>
                  ) : null}
                  {!readOnly && !canCancel && !cancelled && !ended && role === "student" ? (
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Cancellation closes 12 hours before the lesson. Contact
                      ABVN for urgent changes.
                    </p>
                  ) : null}
                  {lesson.teacher_comment ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <h4 className="font-semibold text-slate-900">
                        Teacher feedback
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-700">
                        {lesson.teacher_comment}
                      </p>
                    </div>
                  ) : null}
                  {lesson.student_comment ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <h4 className="font-semibold text-slate-900">
                        Student feedback
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-700">
                        {lesson.student_comment}
                      </p>
                    </div>
                  ) : null}
                  {!readOnly && ended &&
                  !cancelled &&
                  lesson.booking_id &&
                  role !== "admin" ? (
                    <details className="mt-5 border-t border-slate-100 pt-4">
                      <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-(--primary)">
                        Leave or update{" "}
                        {role === "teacher"
                          ? "attendance & teacher feedback"
                          : "lesson feedback"}
                      </summary>
                      <ActionForm
                        action={submitFeedback}
                        submitLabel="Save feedback"
                        className="mt-4"
                      >
                        <input
                          type="hidden"
                          name="booking_id"
                          value={lesson.booking_id}
                        />
                        {role === "teacher" ? (
                          <Select
                            label="Student attendance"
                            name="attendance"
                            defaultValue={lesson.attendance ?? ""}
                            required
                          >
                            <option value="" disabled>
                              Select attendance
                            </option>
                            {Object.entries(attendanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </Select>
                        ) : null}
                        <TextArea
                          label={
                            role === "teacher"
                              ? "Teacher feedback"
                              : "Your feedback for the teacher"
                          }
                          name="comment"
                          required
                          maxLength={2000}
                          rows={4}
                          defaultValue={
                            (role === "teacher"
                              ? lesson.teacher_comment
                              : lesson.student_comment) ?? ""
                          }
                        />
                        <p className="text-sm text-slate-600">
                          Feedback is shared with the other participant and ABVN
                          administrators.
                        </p>
                        {role === "teacher" ? <p className="text-sm leading-6 text-slate-600">Choose Cancelled if you missed the lesson or cancelled outside ABVN. Saving cancels the booking without reopening the slot, preserves history, and excludes it from student class-limit counts. No but Apologize records an excused absence; neither absence option automatically bans the student.</p> : null}
                      </ActionForm>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
