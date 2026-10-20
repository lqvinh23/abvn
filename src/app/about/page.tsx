import Image from "next/image";
import Link from "next/link";
import JourneyTimeline from "@/src/components/about/JourneyTimeline";
import SdgExplorer from "@/src/components/about/SdgExplorer";

const values = [
  {
    title: "Integrity",
    description:
      "We act with honesty, respect, and accountability in every interaction.",
  },
  {
    title: "Personal and community growth",
    description:
      "Individual growth and community development go hand in hand. We learn, share, and support one another.",
  },
  {
    title: "Positivity and initiative",
    description:
      "We approach challenges with a positive attitude and take proactive steps to make a difference.",
  },
];

const commitments = [
  "Participant safety and well-being",
  "Equal opportunity and non-discrimination",
  "Transparency and accountability",
  "Continuous improvement in program quality",
];

const foundingTeachers = [
  { name: "Alon Kaiser", image: "/images/founding-teacher-alon-placeholder.jpg" },
  { name: "James (Jim) Peters", image: "/images/founding-teacher-jim-placeholder.jpg" },
  { name: "Jon Best", image: "/images/founding-teacher-jon-placeholder.jpg" },
];

const teams = [
  {
    title: "Education Affairs",
    description:
      "Oversees student recruitment and monitors teaching and learning activities.",
    leader: "Minh Tam",
    image: "/images/team-nhat-linh-placeholder.jpg",
    members: [
      { name: "Nhat Linh", image: "/images/team-nhat-linh-placeholder.jpg" },
      { name: "Tu Thu", image: "/images/team-tu-thu-placeholder.jpg" },
      { name: "Hong Thu", image: "/images/team-hong-thu-placeholder.jpg" },
      { name: "Thu Trang", image: "/images/team-thu-trang-placeholder.jpg" },
    ],
  },
  {
    title: "Human Resources",
    description:
      "Coordinates volunteer and team recruitment, and creates opportunities for the community to connect.",
    leader: "Quynh Nhu",
    image: "/images/team-hr-placeholder.jpg",
    members: [
      { name: "Tra My", image: "/images/team-tra-my-placeholder.jpg" },
      { name: "Hong Hanh", image: "/images/team-hong-hanh-placeholder.jpg" },
      { name: "Ngoc Giau", image: "/images/team-ngoc-giau-placeholder.jpg" },
    ],
  },
  {
    title: "Communication and Outreach",
    description:
      "Manages media channels, partnerships, and fundraising outreach.",
    leader: "Quang Vinh",
    image: "/images/founding-teacher-jim-placeholder.jpg",
    members: [
      { name: "Hong Nhung", image: "/images/team-hong-nhung-placeholder.jpg" },
      { name: "Thao Ngan", image: "/images/team-thao-ngan-placeholder.jpg" },
      { name: "My Huyen", image: "/images/team-my-huyen-placeholder.jpg" },
      { name: "Thuy Tien", image: "/images/team-thuy-tien-placeholder.jpg" },
    ],
  },
];

export const metadata = {
  title: "About Us | A Better Vietnam",
  description:
    "Learn about A Better Vietnam's story, mission, values, and commitment to accessible English education.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              About ABVN
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Better English.
              <span className="block text-(--primary)">Better Future.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              A Better Vietnam is a non-profit project founded in 2017. We
              support young Vietnamese people, especially those in
              underprivileged areas, through free one-to-one online English
              lessons with volunteer native-speaking teachers.
            </p>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[25rem]">
            <Image
              src="/images/learning-community.jpg"
              alt="Students learning and sharing ideas together"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our story
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Opportunity should not depend on where you begin.
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-slate-700">
            <p>
              In many parts of Vietnam, talented and motivated young people are
              held back not by a lack of ambition, but by a lack of opportunity.
              Limited access to quality English education and global
              connections can become barriers to further study, employment, and
              personal growth.
            </p>
            <p>
              A Better Vietnam was created to help bridge that gap. What began
              as a small initiative connecting Vietnamese students with
              volunteer English speakers has grown into a global, youth-led
              community for learning, exchange, and growth.
            </p>
            <p>
              At its heart, ABVN is about more than English. It is about helping
              young people gain confidence, find their voice, and discover
              opportunities beyond their immediate environment.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[28rem]">
            <Image
              src="/images/english-classroom.jpg"
              alt="Students taking part in an English class"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our mission
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Help young people shape their own futures.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              We empower underprivileged Vietnamese students and young people
              through access to free English education and meaningful global
              connections.
            </p>
            <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  01
                </span>
                Strengthen English communication skills.
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  02
                </span>
                Broaden global perspectives through language and cultural
                exchange.
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  03
                </span>
                Create opportunities for personal, academic, and professional
                development.
              </li>
            </ul>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              With the right tools and support, young people can shape their
              futures and contribute positively to their communities.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16">
            <div className="max-w-xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                Meet the founder
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                The idea that started A Better Vietnam.
              </h2>
              <p className="mt-6 text-base font-semibold text-(--primary)">
                Mai Thi Thao Chi <span className="text-slate-500">· Founder</span>
              </p>
              <p className="mt-6 text-lg leading-8 text-slate-700">
                A Better Vietnam was founded by Ms. Mai Thi Thao Chi, whose
                vision was to create equal access to English education for
                Vietnamese students, especially those from underprivileged
                backgrounds. Her leadership helped build a platform that
                supports English skills, confidence, connection, and personal
                growth.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-(--muted) lg:aspect-[5/4]">
              <Image
                src="/images/founder-placeholder.jpg"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="mt-20">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-14">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                  The people who built the foundation
                </p>
                <h3 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  Meet our founding teachers.
                </h3>
              </div>
              <p className="max-w-xl text-lg leading-8 text-slate-700">
                ABVN began with a small group of volunteer teachers who
                believed in the mission and supported the project from day one.
                Their dedication continues to inspire new generations of
                volunteers.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {foundingTeachers.map(({ name, image }) => (
                <article
                  key={name}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative h-64 bg-(--muted)">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h4 className="text-lg font-semibold text-slate-900">
                      {name}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Founding volunteer teacher
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-20 border-t border-slate-200 pt-14">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-14">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                  People behind the work
                </p>
                <h3 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Meet our teams.
                </h3>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
                ABVN’s teams coordinate learner support, volunteer recruitment,
                and outreach.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {teams.map(
                ({ title, description, leader, members, image }) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-(--muted)">
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900">{leader}</h4>
                        <p className="text-sm text-slate-700">Team Leader</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-6 py-5">
                      <h5 className="text-lg font-bold text-(--primary)">
                        {title}
                      </h5>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {description}
                      </p>
                      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Team members
                      </p>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                        {members.map(({ name, image }) => (
                          <li
                            key={name}
                            className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-2.5"
                          >
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-(--muted)">
                              <Image
                                src={image}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-800">
                                {name}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              What we do
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              One-to-one learning, shaped by people.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Through our online platform, teachers set their own schedules
              while learners book free lessons that fit their needs.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-7 sm:p-9">
              <h3 className="text-2xl font-semibold text-(--primary)">
                For learners
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-700">
                We provide free one-to-one online English lessons for motivated
                Vietnamese learners from underprivileged backgrounds. Learners
                are selected through an application and interview process. Once
                accepted, they can register for up to two lessons a week with
                different volunteer tutors during a six-month learning period.
              </p>
              <Link
                href="/student-apply"
                className="mt-6 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                Student program information
              </Link>
            </article>
            <article className="rounded-2xl border border-slate-200 p-7 sm:p-9">
              <h3 className="text-2xl font-semibold text-(--primary)">
                For volunteer teachers
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Volunteers can teach from anywhere, set their own schedules,
                and choose methods that suit their students. After an
                application and interview process, teachers help learners
                develop English skills while sharing meaningful cross-cultural
                connections. Volunteering with ABVN is unpaid.
              </p>
              <Link
                href="/apply"
                className="mt-6 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                Volunteer teacher information
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our values
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              How we work together.
            </h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {values.map(({ title, description }) => (
              <article
                key={title}
                className="rounded-2xl bg-white p-7 sm:p-8"
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
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our journey
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              From a few lessons to a global community.
            </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-slate-600">
              Each milestone reflects the people, partnerships, and shared
              commitment behind ABVN’s growth.
            </p>
          </div>
          <JourneyTimeline />
        </div>
      </section>

      <section className="bg-(--muted) px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Be part of the journey.
            </h2>
            <p className="mt-2 text-base text-slate-700">
              Students, volunteers, and partners are welcome to connect.
            </p>
          </div>
          <a
            href="mailto:abettervnproject@gmail.com"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-(--primary) px-6 py-3 font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            Contact ABVN
          </a>
        </div>
      </section>

      <section className="bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our impact and commitments
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Education that builds connection and opportunity.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              ABVN aligns its work with the United Nations Sustainable
              Development Goals and works to create a safe, respectful, and
              inclusive environment.
            </p>
          </div>
          <SdgExplorer />
          <ul className="mt-8 grid gap-3 text-base leading-7 text-slate-700 sm:grid-cols-2">
            {commitments.map((commitment) => (
              <li key={commitment} className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  ✓
                </span>
                {commitment}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-(--primary) px-7 py-10 text-white sm:px-12 sm:py-14">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                Be part of the journey
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Help make English learning more accessible.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/90">
                Share your experience as a volunteer teacher or learn more
                about joining the student program.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/apply"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 py-3 text-center font-semibold text-(--primary) transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Become a teacher
              </Link>
              <Link
                href="/student-apply"
                className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Student program
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
