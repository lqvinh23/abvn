import Image from "next/image";
import Link from "next/link";

const programDetails = [
  {
    title: "100% free",
    description: "A six-month program for students who are selected.",
  },
  {
    title: "One-to-one lessons",
    description: "Learn with volunteer teachers matched to your level.",
  },
  {
    title: "Flexible online learning",
    description: "Meet online and agree on a schedule with your teacher.",
  },
];

const eligibility = [
  "Be aged 16 or above and motivated to improve practical English.",
  "Commit to at least two sessions per week during the six-month program.",
  "Have an internet-connected device with a camera and microphone.",
  "Have an English level from A1 to B2, assessed during the interview.",
];

export const metadata = {
  title: "Become a Student | A Better Vietnam",
  description:
    "Learn about ABVN's free online English learning program for Vietnamese students.",
};

export default function StudentApplicationPage() {
  return (
    <main className="flex-1">
      <section className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Become a student
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Start your English learning journey.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              ABVN provides free online English lessons with volunteer teachers
              for motivated Vietnamese learners, especially those from
              underprivileged backgrounds.
            </p>
            <div
              role="status"
              className="mt-7 rounded-xl border border-green-200 bg-white p-5"
            >
              <p className="font-semibold text-slate-900">
                Applications are currently closed.
              </p>
              <p className="mt-2 text-base leading-7 text-slate-700">
                The student portal reopens every six months. Follow ABVN’s
                channels for updates about the next application period.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-(--primary) bg-white px-6 py-3 font-semibold text-(--primary) transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              Sign in to the student portal
            </Link>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[25rem]">
            <Image
              src="/images/learning-community.jpg"
              alt="Young people learning together"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              About the program
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Support that fits your learning journey.
            </h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {programDetails.map(({ title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 p-7"
              >
                <h3 className="text-xl font-semibold text-(--primary)">
                  {title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                Eligibility
              </h2>
              <ul className="mt-5 space-y-4">
                {eligibility.map((requirement) => (
                  <li
                    key={requirement}
                    className="flex gap-3 text-base leading-7 text-slate-700"
                  >
                    <span
                      aria-hidden="true"
                      className="font-bold text-(--primary)"
                    >
                      ✓
                    </span>
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                What happens when applications open?
              </h2>
              <ol className="mt-5 space-y-4 text-base leading-7 text-slate-700">
                <li>
                  <strong className="text-slate-900">1. Apply.</strong> Complete
                  the registration form and English self-assessment.
                </li>
                <li>
                  <strong className="text-slate-900">
                    2. Application review.
                  </strong>{" "}
                  ABVN reviews applications for eligibility and program fit.
                </li>
                <li>
                  <strong className="text-slate-900">3. Interview.</strong> Meet
                  with the team to discuss your needs and goals.
                </li>
                <li>
                  <strong className="text-slate-900">4. Decision.</strong>{" "}
                  Receive an update and next steps from ABVN.
                </li>
              </ol>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Program information reflects the student application page on
                ABVN’s current website and may change.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
