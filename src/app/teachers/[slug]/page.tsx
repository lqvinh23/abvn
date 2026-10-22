import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DEMO_INTRO_VIDEO_URL,
  teacherProfiles,
} from "@/src/lib/teacher-profiles";

const lessonMilestones = [1, 10, 100, 500, 1000, 5000, 10000];

export function generateStaticParams() {
  return teacherProfiles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/teachers/[slug]">) {
  const { slug } = await params;
  const teacher = teacherProfiles.find((profile) => profile.slug === slug);

  return {
    title: teacher
      ? `${teacher.name} | A Better Vietnam Volunteer Teacher`
      : "Teacher profile | A Better Vietnam",
    description: teacher
      ? `Public directory profile for ${teacher.name}, a volunteer teacher with A Better Vietnam.`
      : "Volunteer teacher profile at A Better Vietnam.",
  };
}

export default async function TeacherProfilePage({
  params,
}: PageProps<"/teachers/[slug]">) {
  const { slug } = await params;
  const teacher = teacherProfiles.find((profile) => profile.slug === slug);

  if (!teacher) {
    notFound();
  }

  const { sampleDetails } = teacher;
  const achievedMilestones = lessonMilestones.filter(
    (lessons) => lessons <= teacher.sessions,
  );
  const nextMilestone = lessonMilestones.find(
    (lessons) => lessons > teacher.sessions,
  );
  const isDemoVideo = !teacher.introVideoUrl;

  return (
    <main className="flex-1">
      <section className="bg-(--muted) px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/teachers"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            ← Back to volunteer teachers
          </Link>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Profile preview: activity status, interests, teaching details, and
            learner counts are sample content. The portrait is a placeholder.
          </p>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[18rem_1fr] md:gap-12">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <Image
                src={teacher.portrait}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 288px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                  ABVN volunteer teacher
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    teacher.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {teacher.status === "active" ? "Active" : "Guest"} · Sample
                  status
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {teacher.name}
              </h1>
              <p className="mt-4 text-lg text-slate-700">
                Based in {teacher.location}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Country: {teacher.country}
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border-t border-slate-200 pt-4">
                  <dt className="text-sm font-medium text-slate-600">
                    Member since
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">
                    {teacher.memberSince}
                  </dd>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <dt className="text-sm font-medium text-slate-600">
                    Lessons taught
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">
                    {teacher.sessions.toLocaleString("en-US")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Biography
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                About {teacher.name}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                {teacher.bio ?? sampleDetails.bio}
              </p>
              {!teacher.bio ? (
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Sample biography for layout preview, not a statement by this
                  teacher.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Learning together · Sample
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Teaching focus & approach
              </h2>
              <ul
                className="mt-5 flex flex-wrap gap-2"
                aria-label="Sample teaching focus"
              >
                {sampleDetails.teachingFocus.map((focus) => (
                  <li
                    key={focus}
                    className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-(--primary)"
                  >
                    {focus}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-base leading-7 text-slate-700">
                {sampleDetails.teachingApproach}
              </p>
              <h3 className="mt-6 text-base font-semibold text-slate-950">
                Languages · Sample
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-700">
                {sampleDetails.languages.join(" · ")}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Beyond the classroom · Sample
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Hobbies & interests
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                A few conversation starters to help you get to know each other.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {sampleDetails.hobbies.map((hobby) => (
                  <li
                    key={hobby}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  >
                    {hobby}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                A journey of giving back
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Community milestones
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Lesson milestones are based on the listed lesson count.
              </p>
              <ol className="mt-6 space-y-5">
                <li className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-3 shrink-0 rounded-full bg-(--primary)"
                  />
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Joined the ABVN community
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {teacher.memberSince}
                    </p>
                  </div>
                </li>
                {achievedMilestones.map((lessons) => (
                  <li key={lessons} className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-3 shrink-0 rounded-full bg-(--primary)"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {lessons === 1
                          ? "First lesson shared"
                          : `${lessons.toLocaleString("en-US")} lessons milestone`}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">Reached</p>
                    </div>
                  </li>
                ))}
              </ol>
              {nextMilestone ? (
                <div className="mt-7 rounded-xl bg-(--muted) p-5">
                  <label
                    htmlFor="lesson-milestone"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Next milestone: {nextMilestone.toLocaleString("en-US")}{" "}
                    lessons
                  </label>
                  <progress
                    id="lesson-milestone"
                    value={teacher.sessions}
                    max={nextMilestone}
                    className="mt-3 block h-2 w-full accent-(--primary)"
                  >
                    {teacher.sessions} of {nextMilestone} lessons
                  </progress>
                  <p className="mt-3 text-sm text-slate-600">
                    {(nextMilestone - teacher.sessions).toLocaleString("en-US")}{" "}
                    lessons to go
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <aside
            aria-label="Teacher introduction and statistics"
            className="space-y-6"
          >
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-950">
                  Introduction video
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isDemoVideo
                    ? "Demo video only: this sample film is not an introduction by this teacher."
                    : `Meet ${teacher.name} and learn about their teaching.`}
                </p>
              </div>
              <div className="aspect-video bg-(--muted)">
                <iframe
                  src={teacher.introVideoUrl ?? DEMO_INTRO_VIDEO_URL}
                  title={
                    isDemoVideo
                      ? "Demo video: Big Buck Bunny (not a teacher introduction)"
                      : `${teacher.name} introduction video`
                  }
                  className="size-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-950">
                Lesson statistics
              </h2>
              <dl className="mt-5 space-y-5">
                <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-4">
                  <dt className="text-sm text-slate-600">Lessons taught</dt>
                  <dd className="text-2xl font-bold text-(--primary)">
                    {teacher.sessions.toLocaleString("en-US")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-4">
                  <dt className="text-sm text-slate-600">
                    Learners supported · Sample
                  </dt>
                  <dd className="text-2xl font-bold text-slate-950">
                    {sampleDetails.learnersSupported}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-slate-600">
                    Lesson milestones reached
                  </dt>
                  <dd className="text-2xl font-bold text-slate-950">
                    {achievedMilestones.length}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="rounded-2xl bg-(--muted) p-6">
              <h2 className="text-xl font-semibold text-slate-950">
                Inspired to make a difference?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Share your time and experience with a learner through ABVN.
              </p>
              <Link
                href="/apply"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-(--primary) px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                Become a volunteer teacher
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/teachers"
          className="inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          ← Back to all volunteer teachers
        </Link>
      </div>
    </main>
  );
}
