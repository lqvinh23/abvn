import Image from "next/image";
import Link from "next/link";
import PartnerCarousel from "@/src/components/home/PartnerCarousel";
import TestimonialsCarousel from "@/src/components/home/TestimonialsCarousel";

const milestones = [
  { value: "9", label: "Years of operation" },
  { value: "1,255+", label: "Students taught" },
  { value: "148+", label: "Volunteer teachers" },
  { value: "38,539+", label: "One-to-one lessons" },
];

const partners = [
  {
    name: "Passerelles Numériques",
    relationship: "Partner",
    logo: "/images/partners/passerelles-numeriques-logo.png",
    logoWidth: 344,
    logoHeight: 146,
  },
  {
    name: "Da Nang University of Architecture",
    relationship: "University partner",
    logo: "/images/partners/danang-university-of-architecture.png",
    logoWidth: 150,
    logoHeight: 152,
  },
  {
    name: "The University of Danang - University of Science and Technology",
    relationship: "University partner",
    logo: "/images/partners/danang-university-of-science-and-technology.png",
    logoWidth: 397,
    logoHeight: 63,
  },
  {
    name: "Peace Corps",
    relationship: "Partner",
    logo: "/images/partners/peace-corps-logo.svg",
    logoWidth: 720,
    logoHeight: 720,
  },
  {
    name: "YSEALI Seeds for the Future",
    relationship: "Program support · 2020",
    logo: "/images/partners/yseali-logo.png",
    logoWidth: 536,
    logoHeight: 532,
  },
];

const studentTestimonials = [
  {
    quote:
      "Having a teacher to talk with every week helped me become more confident sharing my ideas in English.",
    name: "Minh Anh",
    detail: "ABVN student · Vietnam",
    image: "/images/student-community.jpg",
    imageAlt: "Student taking part in a learning community",
  },
  {
    quote:
      "The lessons gave me a chance to practice speaking naturally and learn about life in another country.",
    name: "Thảo Vy",
    detail: "ABVN student · Vietnam",
    image: "/images/learning-community.jpg",
    imageAlt: "Learners sharing ideas together",
  },
  {
    quote:
      "I used to be shy about making mistakes. Now I am more comfortable asking questions and trying again.",
    name: "Ngọc Hà",
    detail: "ABVN student · Vietnam",
    image: "/images/student-community.jpg",
    imageAlt: "Students learning together",
  },
  {
    quote:
      "Learning one to one made it easier to talk about the things I care about and practice at my own pace.",
    name: "Phương Linh",
    detail: "ABVN student · Vietnam",
    image: "/images/learning-community.jpg",
    imageAlt: "Learners studying in a supportive community",
  },
  {
    quote:
      "I have learned new English skills and also made a connection with someone from a different culture.",
    name: "Bảo Ngọc",
    detail: "ABVN student · Vietnam",
    image: "/images/student-community.jpg",
    imageAlt: "Students participating in a community activity",
  },
];

const teacherTestimonials = [
  {
    quote:
      "It is a joy to watch a student become more confident with every conversation. We learn from each other.",
    name: "Alon",
    detail: "Volunteer teacher",
    image: "/images/founding-teacher-alon-placeholder.jpg",
    imageAlt: "Volunteer teacher",
  },
  {
    quote:
      "The flexible format makes it easy to build a genuine connection and focus on what each learner needs.",
    name: "Jim",
    detail: "Volunteer teacher",
    image: "/images/founding-teacher-jim-placeholder.jpg",
    imageAlt: "Volunteer teacher",
  },
  {
    quote:
      "Every lesson is an opportunity to encourage curiosity, exchange perspectives, and celebrate progress.",
    name: "Jon",
    detail: "Volunteer teacher",
    image: "/images/founding-teacher-jon-placeholder.jpg",
    imageAlt: "Volunteer teacher",
  },
  {
    quote:
      "Supporting a learner’s goals through conversation has been one of the most meaningful ways to volunteer.",
    name: "A volunteer teacher",
    detail: "ABVN teaching community",
    image: "/images/volunteer-team.jpg",
    imageAlt: "Volunteer teachers working together",
  },
  {
    quote:
      "The program brings people together through a shared belief in education and the value of listening.",
    name: "A volunteer teacher",
    detail: "ABVN teaching community",
    image: "/images/global-learning.jpg",
    imageAlt: "People learning and connecting across cultures",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.88fr] lg:gap-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
              Better English - Better Future
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Opportunity begins with{" "}
              <span className="text-(--primary)">a conversation.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A Better Vietnam connects young people in Vietnam with volunteer
              teachers around the world for free, one-to-one online English
              lessons.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/apply"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-(--primary) px-7 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                Become a Volunteer Teacher
              </Link>
              <Link
                href="/student-apply"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-center text-base font-semibold text-slate-800 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                Apply as a Student
              </Link>
            </div>
            <Link
              href="/about"
              className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 underline-offset-4 transition-colors hover:text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              Discover our story
            </Link>
          </div>

          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[--muted]">
              <Image
                src="/images/english-classroom.jpg"
                alt="A teacher leading an English lesson"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </figure>
        </div>
      </section>

      <section
        aria-labelledby="impact-heading"
        className="border-y border-slate-200 bg-[#fafbf9] px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--primary)">
                Our impact
              </p>
              <h2
                id="impact-heading"
                className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
              >
                A growing community. Lasting connections.
              </h2>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Figures from ABVN’s public project information.
            </p>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4 lg:gap-0">
            {milestones.map(({ value, label }) => (
              <div
                key={label}
                className="border-l-2 border-green-200 pl-4 sm:pl-5 lg:px-6 first:lg:border-l-0 first:lg:pl-0"
              >
                <dd className="text-3xl font-semibold tracking-tight text-(--primary) sm:text-4xl">
                  {value}
                </dd>
                <dt className="mt-1 text-sm leading-5 text-slate-600">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Our purpose
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              More than English lessons.
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-slate-700">
              We help young people strengthen communication skills, exchange
              language and culture with people around the world, and build
              confidence for future opportunities.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              Learn about ABVN
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#fafbf9] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-3">
          <Link
            href="/about"
            className="group overflow-hidden bg-white transition-colors"
          >
            <div className="relative h-52">
              <Image
                src="/images/learning-community.jpg"
                alt="Students learning and sharing together"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7">
              <h2 className="text-xl font-semibold text-slate-900">
                About Us
              </h2>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Discover our story, mission, values, and journey since 2017.
              </p>
              <span className="mt-4 inline-flex font-semibold text-(--primary)">
                Our story
              </span>
            </div>
          </Link>

          <Link
            href="/teachers"
            className="group overflow-hidden bg-white transition-colors"
          >
            <div className="relative h-52">
              <Image
                src="/images/volunteer-team.jpg"
                alt="A diverse group of volunteers working together"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7">
              <h2 className="text-xl font-semibold text-slate-900">
                Volunteer Teachers
              </h2>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Meet teachers who share their experience and time with learners.
              </p>
              <span className="mt-4 inline-flex font-semibold text-(--primary)">
                Meet our teachers
              </span>
            </div>
          </Link>

          <Link
            href="/news"
            className="group overflow-hidden bg-white transition-colors"
          >
            <div className="relative h-52">
              <Image
                src="/images/english-classroom.jpg"
                alt="An English language class in progress"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7">
              <h2 className="text-xl font-semibold text-slate-900">
                News &amp; Activities
              </h2>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Read the latest updates and stories from our community.
              </p>
              <span className="mt-4 inline-flex font-semibold text-(--primary)">
                Read the latest
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="testimonials-heading"
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
              Voices from our community
            </p>
            <h2
              id="testimonials-heading"
              className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
            >
              Every conversation helps us grow.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Learning is a shared journey for students and volunteer teachers.
            </p>
          </div>
          <TestimonialsCarousel
            id="student-stories"
            title="Student stories"
            testimonials={studentTestimonials}
          />
          <TestimonialsCarousel
            id="teacher-stories"
            title="Teacher stories"
            testimonials={teacherTestimonials}
          />
        </div>
      </section>

      <section
        aria-labelledby="partners-heading"
        className="border-y border-slate-200 bg-[#fafbf9] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
                Our partners
              </p>
              <h2
                id="partners-heading"
                className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                In good company.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-slate-600">
              We work alongside organizations that share a commitment to
              education and opportunity.
            </p>
          </div>
          <PartnerCarousel partners={partners} />
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Interested in supporting accessible English education or
              partnering with ABVN?
            </p>
            <a
              href="mailto:abettervnproject@gmail.com"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-(--primary) transition-colors hover:text-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              Get in touch
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
