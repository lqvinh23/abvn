import Image from "next/image";
import Link from "next/link";

const volunteerBenefits = [
  "Teach online from anywhere in the world.",
  "Set a schedule that works for you and your students.",
  "Choose teaching methods that suit each learner.",
  "Build meaningful connections across cultures.",
];

export const metadata = {
  title: "Become a Volunteer Teacher | A Better Vietnam",
  description:
    "Learn how to volunteer as an English teacher with A Better Vietnam.",
};

export default function ApplyAsTeacherPage() {
  return (
    <main className="flex-1">
      <section className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Become a teacher
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Share your English. Make a connection.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Volunteer teachers support young people in Vietnam through free
              online English lessons, conversation, and cultural exchange.
            </p>
            <a
              href="https://abettervietnam.org/apply"
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-md bg-(--primary) px-7 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              Continue to teacher application
            </a>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Application opens on the current ABVN website.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline"
            >
              Sign in or request a teacher membership
            </Link>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[25rem]">
            <Image
              src="/images/volunteer-team.jpg"
              alt="Volunteers collaborating and supporting one another"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              The role
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Teach English. Learn from each other.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              ABVN welcomes volunteers who are passionate about giving back and
              supporting young people. Teachers and students learn
              collaboratively and build cross-cultural connections.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Volunteering with ABVN
            </h2>
            <ul className="mt-5 space-y-4">
              {volunteerBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex gap-3 text-base leading-7 text-slate-700"
                >
                  <span
                    aria-hidden="true"
                    className="font-bold text-(--primary)"
                  >
                    ✓
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-base leading-7 text-slate-600">
              Volunteers are selected through an application and interview
              process. The role is unpaid.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
