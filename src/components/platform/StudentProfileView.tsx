import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { DateTime } from "luxon";
import type { StudentFeedback, StudentProfileReport } from "@/src/lib/platform/types";
import { timeZoneOptionLabel } from "@/src/lib/platform/calendar";
import { studentAddress, studentMilestones, studyPeriod } from "@/src/lib/platform/student-directory";
import ActionIcon from "./ActionIcon";
import PaginatedTable from "./PaginatedTable";
import StudentProfileTabs from "./StudentProfileTabs";
import StudentStudyTrend from "./StudentStudyTrend";

const statusClass: Record<string, string> = {
  active: "bg-green-50 text-green-900",
  inactive: "bg-slate-100 text-slate-700",
  suspended: "bg-amber-50 text-amber-900",
  banned: "bg-rose-50 text-rose-900",
};
const attendanceLabel: Record<string, { label: string; className: string }> = {
  present: { label: "Attended", className: "bg-green-50 text-green-900" },
  absent: { label: "Absent", className: "bg-rose-50 text-rose-900" },
  apologized: { label: "Absent with apology", className: "bg-amber-50 text-amber-900" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-700" },
};
const empty = <span className="font-normal text-slate-400">-</span>;

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{aside}</div>
    <div className="p-4">{children}</div>
  </section>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-sm text-slate-900">{children}</dd></div>;
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export default function StudentProfileView({ report, photoUrl, photoWarning, cvUrl, timeZone, now }: {
  report: StudentProfileReport; photoUrl: string | null; photoWarning: boolean; cvUrl: string | null; timeZone: string; now: number;
}) {
  const { profile, details, application, stats, restrictions } = report;
  const admin = report.viewer === "admin";
  const role = report.viewer;
  const date = (value: string | null) => value ? DateTime.fromISO(value, { zone: timeZone }).toFormat("dd/MM/yyyy") : "-";
  const dateTime = (value: string | null) => value ? DateTime.fromISO(value, { zone: timeZone }).toFormat("dd/MM/yyyy HH:mm") : "-";
  const period = studyPeriod(profile, now, timeZone);
  const milestones = studentMilestones(stats.attended, report.milestones);
  const address = [profile.address, studentAddress(profile)].filter(Boolean).join(", ");
  const calculatedAge = details?.date_of_birth
    ? Math.floor(DateTime.fromMillis(now, { zone: timeZone }).diff(DateTime.fromISO(details.date_of_birth, { zone: timeZone }), "years").years)
    : null;
  const age = details?.age ?? (admin ? calculatedAge : null);
  const initials = profile.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const attendedAt = report.lessons.filter(lesson => lesson.booking_status === "completed" && lesson.attendance === "present").map(lesson => lesson.starts_at);
  const absentTotal = stats.absent + stats.apologized;
  const tiles = [
    { label: "Total attended lessons", value: stats.attended, note: stats.hours ? `${stats.hours} hours learned` : "No lessons attended yet" },
    { label: "Total teachers studied", value: stats.teachers, note: stats.teachers === 1 ? "1 teacher" : `${stats.teachers} different teachers` },
    { label: "Total absent", value: absentTotal, note: `${stats.apologized} with apology · ${stats.absent} without` },
  ];
  const lastLesson = new Map<string, number>();
  for (const lesson of report.lessons) lastLesson.set(lesson.teacher_code, Math.max(lastLesson.get(lesson.teacher_code) ?? 0, Date.parse(lesson.starts_at)));
  const byTeacher = new Map<string, StudentFeedback[]>();
  for (const item of report.feedback) byTeacher.set(item.teacher_code, [...(byTeacher.get(item.teacher_code) ?? []), item]);
  const teacherGroups = [...byTeacher.entries()]
    .map(([code, items]) => ({ code, name: items[0].teacher_name, items: items.toSorted((a, b) => Date.parse(b.lesson_at) - Date.parse(a.lesson_at)), latest: lastLesson.get(code) ?? Math.max(...items.map(item => Date.parse(item.lesson_at))) }))
    .toSorted((a, b) => b.latest - a.latest || a.name.localeCompare(b.name));

  const profileTab = <div className="grid gap-3 xl:grid-cols-3">
    <div className="grid min-w-0 content-start gap-3 xl:col-span-2">
      <Card title="About">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Fact label="Biography"><span className="whitespace-pre-wrap leading-6">{profile.bio || empty}</span></Fact></div>
          <Fact label="Learning goals">{profile.goals || empty}</Fact>
          <Fact label="Hobbies and interests">{profile.hobbies || empty}</Fact>
        </dl>
      </Card>
      <StudentStudyTrend attendedAt={attendedAt} timeZone={timeZone} now={now} />
      {admin ? <Card title="All lessons" aside={<span className="text-xs text-slate-500">{report.lessons.length} in total</span>}>
        <PaginatedTable caption="All lessons" columns={4} tableClassName="min-w-[560px]" initialSort={{ index: 0, descending: true }} emptyMessage="This student has no lessons yet." resetKey={String(report.lessons.length)}
          headers={<tr>{["Date", "Lesson", "Teacher", "Result"].map(label => <th key={label} scope="col" className="px-2 py-2 font-semibold">{label}</th>)}</tr>}>
          {report.lessons.map(lesson => {
            const result = lesson.booking_status === "cancelled" ? attendanceLabel.cancelled : lesson.attendance ? attendanceLabel[lesson.attendance] : { label: "Booked", className: "bg-sky-50 text-sky-900" };
            return <tr key={`${lesson.starts_at}-${lesson.teacher_code}`}>
              <td data-sort-value={lesson.starts_at} className="whitespace-nowrap px-2 py-2 tabular-nums">{dateTime(lesson.starts_at)}</td>
              <td className="px-2 py-2">{lesson.title || "English conversation"}</td>
              <td className="px-2 py-2"><Link className="text-green-900 hover:underline" href={`/members/${lesson.teacher_code}`}>{lesson.teacher_name}</Link></td>
              <td className="px-2 py-2"><Badge className={result.className}>{result.label}</Badge></td>
            </tr>;
          })}
        </PaginatedTable>
      </Card> : null}
    </div>

    <div className="grid min-w-0 content-start gap-3">
      <Card title="Personal details">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div className="col-span-2"><Fact label="Email">{profile.email ? <a className="break-all text-green-900 hover:underline" href={`mailto:${profile.email}`}>{profile.email}</a> : empty}</Fact></div>
          {admin ? <>
            <Fact label="Phone">{details?.phone || empty}</Fact>
            <Fact label="Date of birth">{details?.date_of_birth ? `${date(details.date_of_birth)}${age !== null ? ` (${age})` : ""}` : empty}</Fact>
            <div className="col-span-2"><Fact label="National / Citizen ID number (last 8 digits)">{details?.national_id_last8 || empty}</Fact></div>
            <div className="col-span-2"><Fact label="Facebook">{profile.facebook_url ? <a className="break-all text-green-900 underline" href={profile.facebook_url} target="_blank" rel="noopener noreferrer">{profile.facebook_url.replace(/^https:\/\/(www\.)?/, "")}</a> : empty}</Fact></div>
          </> : <Fact label="Age">{age !== null ? age : empty}</Fact>}
          <div className="col-span-2"><Fact label={admin ? "Address" : "Location"}>{address || empty}</Fact></div>
          <div className="col-span-2"><Fact label="Time zone">{timeZoneOptionLabel(profile.time_zone, now)}</Fact></div>
          <Fact label="Occupation">{profile.occupation || empty}</Fact>
          <Fact label="Organization">{profile.organization || empty}</Fact>
          <Fact label="Introduction video">{details?.intro_video_url ? <a className="text-green-900 underline" href={details.intro_video_url} target="_blank" rel="noopener noreferrer">Watch video</a> : empty}</Fact>
          <Fact label="CV">{cvUrl ? <a className="text-green-900 underline" href={cvUrl}>Download</a> : empty}</Fact>
        </dl>
      </Card>
      <Card title="Milestones">
        <ol className="space-y-2.5">
          <li className="flex items-start gap-2.5 text-sm"><span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-(--primary)" /><div><p className="font-medium text-slate-900">Joined ABVN as a student</p><p className="text-xs text-slate-500">{date(profile.student_joined_at ?? profile.created_at)}</p></div></li>
          {milestones.items.map(item => <li key={item.count} className="flex items-start gap-2.5 text-sm"><span aria-hidden="true" className={`mt-1 size-3 shrink-0 rounded-full ${item.reachedAt !== null ? "bg-(--primary)" : "border-2 border-slate-300"}`} /><div><p className={item.reachedAt !== null ? "font-medium text-slate-900" : "text-slate-500"}>{item.label}<span className="sr-only">{item.reachedAt !== null ? " (reached)" : " (not yet reached)"}</span></p>{item.reachedAt ? <p className="text-xs text-slate-500">{date(item.reachedAt)}</p> : null}</div></li>)}
        </ol>
        {milestones.next ? <div className="mt-4"><div className="flex justify-between text-xs text-slate-500"><span>Next: {milestones.next.label}</span><span>{stats.attended}/{milestones.next.count}</span></div><div role="progressbar" aria-label="Progress to the next milestone" aria-valuemin={0} aria-valuemax={milestones.next.count} aria-valuenow={stats.attended} className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-(--primary)" style={{ width: `${Math.min(100, stats.attended / milestones.next.count * 100)}%` }} /></div></div> : <p className="mt-4 text-xs text-slate-500">All lesson milestones reached.</p>}
        <p className="mt-3 text-xs text-slate-500">First lesson {date(stats.first_lesson_at)} · Latest lesson {date(stats.last_lesson_at)}</p>
      </Card>
      {admin ? <Card title="Application form" aside={<span className="text-xs text-slate-500">Synced on acceptance</span>}>
        {application ? <div>
          <p className="text-xs text-slate-500">Submitted {date(application.submitted_at)}{application.decided_at ? ` · accepted ${date(application.decided_at)}` : ""}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.intro}</p>
          {application.answers.length ? <details className="mt-3 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Form answers ({application.answers.length})</summary><dl className="mt-2 space-y-2">{application.answers.map(answer => <Fact key={answer.question_id} label={answer.label}><span className="whitespace-pre-wrap">{answer.answer || empty}</span></Fact>)}</dl></details> : null}
        </div> : <p className="text-sm text-slate-500">No accepted application is on file. This account was given the student role by an admin.</p>}
      </Card> : null}
      {admin ? <Card title="Suspension and ban history">
        {restrictions.length ? <ol className="space-y-2">{restrictions.map(item => <li key={`${item.created_at}-${item.to_status}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.from_status ? <><Badge className={`capitalize ${statusClass[item.from_status]}`}>{item.from_status}</Badge><span aria-label="changed to">→</span></> : null}
            <Badge className={`capitalize ${statusClass[item.to_status]}`}>{item.to_status}</Badge>
            <span className="ml-auto text-xs text-slate-500">{dateTime(item.created_at)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap leading-6 text-slate-700">{item.reason || "No reason recorded."}</p>
          {item.changed_by ? <p className="text-xs text-slate-500">By {item.changed_by}</p> : null}
        </li>)}</ol> : <p className="text-sm text-slate-500">No suspensions or bans on record.</p>}
      </Card> : null}
    </div>
  </div>;

  const feedbackTab = teacherGroups.length ? <div className="grid gap-3 lg:grid-cols-2">{teacherGroups.map(group => <section key={group.code} aria-label={`Feedback from ${group.name}`} className="min-w-0 rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-900">{group.name.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1"><Link className="font-semibold text-slate-900 hover:text-green-900 hover:underline" href={`/members/${group.code}`}>{group.name}</Link><p className="text-xs text-slate-500">Last lesson {date(new Date(group.latest).toISOString())} · {group.items.length} feedback note{group.items.length === 1 ? "" : "s"}</p></div>
    </div>
    <ul className="divide-y divide-slate-100">{group.items.map(item => <li key={`${item.created_at}-${item.lesson_at}`} className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{item.title || "English conversation"}</span><span>{dateTime(item.lesson_at)}</span>
        {item.attendance && attendanceLabel[item.attendance] ? <Badge className={attendanceLabel[item.attendance].className}>{attendanceLabel[item.attendance].label}</Badge> : null}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.comment}</p>
    </li>)}</ul>
  </section>)}</div> : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No teacher has left written feedback for this student yet.</p>;

  return <StudentProfileTabs
    role={role}
    name={profile.full_name}
    number={profile.member_number}
    code={profile.member_code}
    action={admin ? <Link href={`/dashboard/admin/students/${profile.member_code}/edit`} className="button-primary inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold"><ActionIcon name="edit" />Edit student</Link> : null}
    summary={<>
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 bg-white p-4 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-center">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {photoUrl ? <Image src={photoUrl} alt="" width={144} height={192} unoptimized className="h-40 w-32 shrink-0 rounded-xl object-cover sm:h-48 sm:w-36" /> : <span aria-hidden="true" className="flex h-40 w-32 shrink-0 items-center justify-center rounded-xl bg-green-100 text-3xl font-semibold text-green-900 sm:h-48 sm:w-36 sm:text-4xl">{initials}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-900">Student profile</p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{profile.full_name}</h1>
                <Badge className={`capitalize ${statusClass[profile.participation_status]}`}>{profile.participation_status}</Badge>
                {profile.proficiency ? <Badge className="bg-slate-100 text-slate-700">English {profile.proficiency}</Badge> : null}
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-700">{[profile.occupation, profile.organization].filter(Boolean).join(" at ") || "Occupation not provided"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-medium tabular-nums">ID {profile.member_number ?? "pending"}</span>
                <span aria-hidden="true" className="text-slate-300">•</span>
                <span>{studentAddress(profile) || "Location not provided"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                <p><span className="font-medium text-slate-700">Joined</span> <span className="tabular-nums">{date(profile.student_joined_at ?? profile.created_at)}</span></p>
                <p><span className="font-medium text-slate-700">{period.state === "expired" ? "Expired" : "Expires"}</span> <span className={`tabular-nums ${period.state === "expired" ? "font-semibold text-rose-800" : period.state === "soon" ? "font-semibold text-amber-800" : ""}`}>{period.expires?.toFormat("dd/MM/yyyy") ?? "-"}</span>{period.daysLeft !== null && period.state !== "expired" ? <span className="ml-1 text-xs text-slate-500">({period.daysLeft} days left)</span> : null}</p>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" aria-label="Lesson summary">
            {tiles.map(tile => <div key={tile.label} className="flex min-w-0 flex-col items-center justify-center px-2 text-center sm:px-4">
              <dt className="min-h-8 text-xs font-medium leading-4 text-slate-600">{tile.label}</dt>
              <dd className="mt-1 text-4xl font-semibold leading-none tracking-tight tabular-nums text-slate-950">{tile.value}</dd>
              <dd className="mt-1.5 text-[11px] leading-4 text-slate-500">{tile.note}</dd>
            </div>)}
          </dl>
        </div>
      </header>
      {photoWarning ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This student&apos;s photo could not be loaded. Initials are shown instead.</p> : null}
    </>}
    profile={profileTab}
    feedback={feedbackTab}
    feedbackCount={report.feedback.length}
  />;
}
