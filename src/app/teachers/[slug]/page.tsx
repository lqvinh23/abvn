import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherProfiles } from "@/src/lib/teacher-profiles";

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
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(14rem,0.42fr)_1fr] md:gap-12">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              <Image
                src={teacher.portrait}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 34vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Volunteer teacher
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {teacher.name}
              </h1>
              <p className="mt-4 text-lg text-slate-700">{teacher.location}</p>
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
                    Sessions listed
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">
                    {teacher.sessions}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {teacher.bio ? (
        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Biography
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                About {teacher.name}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                {teacher.bio}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {teacher.introVideoUrl ? (
        <section className="bg-(--muted) px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Meet the teacher
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
                Introduction video
              </h2>
            </div>
            <div className="mt-7 aspect-video max-h-[36rem] overflow-hidden rounded-2xl bg-white">
              <iframe
                src={teacher.introVideoUrl}
                title={`${teacher.name} introduction video`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

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
