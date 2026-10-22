"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LESSON_MILESTONES } from "@/src/lib/teacher-profiles";
import type { Database, MemberDetails, Profile } from "@/src/lib/platform/types";

type DirectoryTeacher = Database["public"]["Functions"]["public_teacher_directory"]["Returns"][number];

export default function MemberTeacherProfile({ member, directory, portrait, photoWarning }: {
  member: MemberDetails & Pick<Profile, "member_number">;
  directory: DirectoryTeacher | null;
  portrait: string | null;
  photoWarning: boolean;
}) {
  const [failedPortrait, setFailedPortrait] = useState<string | null>(null);
  const failedPhoto = portrait !== null && failedPortrait === portrait;
  const lessons = directory?.lesson_count ?? null;
  const achieved = lessons === null ? [] : LESSON_MILESTONES.filter(value => value <= lessons);
  const next = lessons === null ? undefined : LESSON_MILESTONES.find(value => value > lessons);
  const memberSince = directory ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(directory.created_at)) : "Not available";
  const count = lessons === null ? "Not available" : lessons.toLocaleString("en-US");
  const card = "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8";
  return <article className="mx-auto max-w-7xl">
    <Link href="/teachers" className="inline-flex min-h-10 items-center text-sm font-semibold text-(--primary) hover:underline">← Back to volunteer teachers</Link>
    <header className="mt-8 grid items-center gap-8 md:grid-cols-[18rem_1fr] md:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {portrait && !failedPhoto ? <Image unoptimized src={portrait} alt={`${member.full_name}'s profile photo`} fill priority sizes="(max-width: 768px) 100vw, 288px" className="object-cover object-top" onError={() => setFailedPortrait(portrait)} /> : <div aria-label={`${member.full_name}, no profile photo available`} className="flex h-full items-center justify-center bg-green-50 text-6xl font-semibold text-green-900">{member.full_name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("")}</div>}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">ABVN volunteer teacher</p><span className={`rounded-full px-3 py-1 text-xs font-semibold ${directory?.participation_status === "active" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>{directory ? directory.participation_status === "guest" ? "Guest" : "Active" : "Not listed publicly"}</span></div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{member.full_name}</h1>
        <p className="mt-4 text-lg text-slate-700">{member.country ? `Based in ${member.country}` : "Country not provided"}</p>
        <p className="mt-2 text-sm text-slate-600">Teacher ID {member.member_number ?? "Not assigned"}</p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">{[["Member since", memberSince], ["Lessons taught", count]].map(([label, value]) => <div key={label} className="border-t border-slate-200 pt-4"><dt className="text-sm font-medium text-slate-600">{label}</dt><dd className="mt-2 text-lg font-semibold text-slate-900">{value}</dd></div>)}</dl>
      </div>
    </header>
    {photoWarning || failedPhoto ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">The teacher photo could not be loaded. Initials are shown instead. Refresh to retry.</p> : null}
    <div className="grid items-start gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <section className={card}><p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">Biography</p><h2 className="mt-3 text-2xl font-semibold text-slate-950">About {member.full_name}</h2><p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{member.bio || "This teacher has not added a biography yet."}</p></section>
        <section className={card}><p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">Learning together</p><h2 className="mt-3 text-2xl font-semibold text-slate-950">Teaching focus & approach</h2><p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">{member.teaching_focus || "This teacher has not added their teaching focus yet."}</p></section>
        <section className={card}><p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">Beyond the classroom</p><h2 className="mt-3 text-2xl font-semibold text-slate-950">Hobbies & interests</h2><p className="mt-3 text-base leading-7 text-slate-700">A few conversation starters to help you get to know each other.</p><p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">{member.hobbies || "This teacher has not added their interests yet."}</p></section>
        <section className={card}><p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">Growing together</p><h2 className="mt-3 text-2xl font-semibold text-slate-950">Community milestones</h2><p className="mt-3 text-sm leading-6 text-slate-600">Lesson milestones are based on completed lessons.</p>
          {directory ? <ol className="mt-6 space-y-5"><li className="flex items-start gap-4"><span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-(--primary)" /><div><h3 className="font-semibold text-slate-900">Joined the ABVN community</h3><p className="mt-1 text-sm text-slate-600">{memberSince}</p></div></li>{achieved.map(value => <li key={value} className="flex items-start gap-4"><span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-(--primary)" /><div><h3 className="font-semibold text-slate-900">{value === 1 ? "First lesson shared" : `${value.toLocaleString("en-US")} lessons milestone`}</h3><p className="mt-1 text-sm text-slate-600">Reached</p></div></li>)}</ol> : <p className="mt-5 text-sm text-slate-600">Public lesson statistics are not available for this teacher.</p>}
          {next !== undefined && lessons !== null ? <div className="mt-7 rounded-xl bg-(--muted) p-5"><label htmlFor="lesson-milestone" className="text-sm font-semibold text-slate-900">Next milestone: {next.toLocaleString("en-US")} lessons</label><progress id="lesson-milestone" value={lessons} max={next} className="mt-3 block h-2 w-full accent-(--primary)">{lessons} of {next} lessons</progress><p className="mt-3 text-sm text-slate-600">{(next - lessons).toLocaleString("en-US")} lessons to go</p></div> : null}
        </section>
      </div>
      <aside aria-label="Teacher introduction and statistics" className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="p-6"><h2 className="text-xl font-semibold text-slate-950">Introduction video</h2><p className="mt-2 text-sm leading-6 text-slate-600">Get to know {member.full_name}.</p></div><div className="flex aspect-video items-center justify-center bg-(--muted) p-6 text-center text-sm leading-6 text-slate-600">This teacher has not published an introduction video yet.</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Lesson statistics</h2><dl className="mt-5 space-y-5"><div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-4"><dt className="text-sm text-slate-600">Lessons taught</dt><dd className="text-2xl font-bold text-(--primary)">{count}</dd></div><div className="flex items-baseline justify-between gap-4"><dt className="text-sm text-slate-600">Lesson milestones reached</dt><dd className="text-2xl font-bold text-slate-950">{lessons === null ? "Not available" : achieved.length}</dd></div></dl></section>
        <div className="rounded-2xl bg-(--muted) p-6"><h2 className="text-xl font-semibold text-slate-950">Inspired to make a difference?</h2><p className="mt-3 text-sm leading-6 text-slate-700">Share your time and experience with a learner through ABVN.</p><Link href="/apply" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-(--primary) px-5 py-3 text-sm font-semibold text-white hover:bg-(--accent)">Become a volunteer teacher</Link></div>
      </aside>
    </div>
    <Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline">← Back to your workspace</Link>
  </article>;
}
