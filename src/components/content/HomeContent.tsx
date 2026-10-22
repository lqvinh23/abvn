import ContentSections from "./ContentSections";
import type { PageContent } from "@/src/lib/content/schema";
import Image from "next/image";
import Link from "next/link";
import PartnerCarousel from "@/src/components/home/PartnerCarousel";
import TestimonialsCarousel from "@/src/components/home/TestimonialsCarousel";
export default function Home({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    const { milestones, partners, learningSteps, communityLinks, studentTestimonials, teacherTestimonials } = getContentData(fields);
    return (<main className="flex-1"><ContentSections order={content.sections} sections={{
            "home-section-1": (<section aria-labelledby="hero-heading" className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.88fr] lg:gap-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
              {fields["home-098"]}</p>
            <h1 id="hero-heading" className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {fields["home-099"]}{" "}
              <span className="text-(--primary)">{fields["home-100"]}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {fields["home-101"]}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={fields["home-102"]} className="inline-flex min-h-12 items-center justify-center rounded-full bg-(--primary) px-7 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                {fields["home-103"]}</Link>
              <Link href={fields["home-104"]} className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-center text-base font-semibold text-slate-800 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                {fields["home-105"]}</Link>
            </div>
            <Link href={fields["home-106"]} className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 underline-offset-4 transition-colors hover:text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
              {fields["home-107"]}</Link>
          </div>

          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[--muted]">
              <Image unoptimized src={fields["home-108"]} alt={fields["home-109"]} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover"/>
            </div>
          </figure>
        </div>
      </section>),
            "home-section-2": (<section aria-labelledby="impact-heading" className="border-y border-slate-200 bg-[#fafbf9] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--primary)">
                {fields["home-110"]}</p>
              <h2 id="impact-heading" className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {fields["home-111"]}</h2>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              {fields["home-112"]}</p>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4 lg:gap-0">
            {milestones.map(({ value, label, illustration }) => (<div key={label} className="border-l-2 border-green-200 pl-4 sm:pl-5 lg:px-6 first:lg:border-l-0 first:lg:pl-0">
                <dd className="text-3xl font-semibold tracking-tight text-(--primary) sm:text-4xl">
                  <span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-green-100 bg-green-50 sm:size-16">
                    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-9 sm:size-10">
                      {illustration.map((path) => (<path key={path} d={path}/>))}
                    </svg>
                  </span>
                  {value}
                </dd>
                <dt className="mt-1 text-sm leading-5 text-slate-600">
                  {label}
                </dt>
              </div>))}
          </dl>
        </div>
      </section>),
            "home-section-3": (<section aria-labelledby="purpose-heading" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                {fields["home-113"]}</p>
              <h2 id="purpose-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {fields["home-114"]}</h2>
            </div>
            <div>
              <p className="text-lg leading-8 text-slate-700">
                {fields["home-115"]}</p>
              <Link href={fields["home-116"]} className="mt-5 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                {fields["home-117"]}</Link>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-200 pt-8 sm:mt-14">
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {fields["home-118"]}</h3>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {learningSteps.map(({ title, description }, index) => (<li key={title} className="rounded-2xl bg-[#fafbf9] p-6 sm:p-7">
                  <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-(--primary)">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className="mt-5 text-lg font-semibold text-slate-950">
                    {title}
                  </h4>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {description}
                  </p>
                </li>))}
            </ol>
          </div>
        </div>
      </section>),
            "home-section-4": (<section aria-labelledby="testimonials-heading" className="bg-[#fafbf9] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
              {fields["home-119"]}</p>
            <h2 id="testimonials-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {fields["home-120"]}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              {fields["home-121"]}</p>
          </div>
          <TestimonialsCarousel id="student-stories" title={fields["home-122"]} testimonials={studentTestimonials}/>
          <TestimonialsCarousel id="teacher-stories" title={fields["home-123"]} testimonials={teacherTestimonials}/>
        </div>
      </section>),
            "home-section-5": (<section aria-labelledby="partners-heading" className="border-y border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
                {fields["home-124"]}</p>
              <h2 id="partners-heading" className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {fields["home-125"]}</h2>
            </div>
            <p className="max-w-md text-base leading-7 text-slate-600">
              {fields["home-126"]}</p>
          </div>
          <PartnerCarousel partners={partners}/>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              {fields["home-127"]}</p>
            <a href={fields["home-128"]} className="inline-flex min-h-11 items-center gap-2 font-semibold text-(--primary) transition-colors hover:text-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
              {fields["home-129"]}<span aria-hidden="true">{fields["home-130"]}</span>
            </a>
          </div>
        </div>
      </section>),
            "home-section-6": (<section aria-labelledby="explore-heading" className="bg-[#fafbf9] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
            {fields["home-131"]}</p>
          <h2 id="explore-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {fields["home-132"]}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {communityLinks.map(({ href, title, description, image, imageAlt, action }) => (<Link key={href} href={href} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--primary)">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image unoptimized src={image} alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"/>
                  </div>
                  <div className="p-6 sm:p-7">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      {description}
                    </p>
                    <span className="mt-5 inline-flex min-h-10 items-center gap-2 font-semibold text-(--primary)">
                      {action}
                      <span aria-hidden="true">{fields["home-133"]}</span>
                    </span>
                  </div>
                </Link>))}
          </div>
        </div>
      </section>),
            "home-section-7": (<section aria-labelledby="join-heading" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-3xl bg-(--primary) p-7 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-100">
              {fields["home-134"]}</p>
            <h2 id="join-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {fields["home-135"]}</h2>
            <p className="mt-5 text-base leading-7 text-green-50 sm:text-lg sm:leading-8">
              {fields["home-136"]}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={fields["home-137"]} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-center font-semibold text-(--primary) transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {fields["home-138"]}</Link>
            <Link href={fields["home-139"]} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 px-7 py-3 text-center font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {fields["home-140"]}</Link>
          </div>
        </div>
      </section>)
        }}/></main>);
}
function getContentData(fields: Record<string, string>) {
    const milestones = [
        {
            value: fields["home-001"],
            label: fields["home-002"],
            illustration: [
                "M9 5v6M23 5v6M5 15h22",
                "M7 8h18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z",
                "m11 21 3 3 7-7",
            ],
        },
        {
            value: fields["home-003"],
            label: fields["home-004"],
            illustration: [
                "m3 12 13-7 13 7-13 7-13-7Z",
                "M8 15v7c5 4 11 4 16 0v-7M29 12v11",
            ],
        },
        {
            value: fields["home-005"],
            label: fields["home-006"],
            illustration: [
                "M20 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM8 27v-3a8 8 0 0 1 16 0v3",
                "M25 7a4 4 0 0 1 0 8M27 19a6 6 0 0 1 3 5v3M7 7a4 4 0 0 0 0 8M5 19a6 6 0 0 0-3 5v3",
            ],
        },
        {
            value: fields["home-007"],
            label: fields["home-008"],
            illustration: [
                "M4 7c5-2 9-1 12 2 3-3 7-4 12-2v18c-5-2-9-1-12 2-3-3-7-4-12-2V7ZM16 9v18",
                "M8 12c2 0 3 .5 4 1M8 17c2 0 3 .5 4 1M20 13c1-.5 2-1 4-1M20 18c1-.5 2-1 4-1",
            ],
        },
    ];
    const partners = [
        {
            name: fields["home-009"],
            relationship: fields["home-010"],
            logo: fields["home-011"],
            logoWidth: 344,
            logoHeight: 146,
        },
        {
            name: fields["home-012"],
            relationship: fields["home-013"],
            logo: fields["home-014"],
            logoWidth: 150,
            logoHeight: 152,
        },
        {
            name: fields["home-015"],
            relationship: fields["home-016"],
            logo: fields["home-017"],
            logoWidth: 397,
            logoHeight: 63,
        },
        {
            name: fields["home-018"],
            relationship: fields["home-019"],
            logo: fields["home-020"],
            logoWidth: 720,
            logoHeight: 720,
        },
        {
            name: fields["home-021"],
            relationship: fields["home-022"],
            logo: fields["home-023"],
            logoWidth: 536,
            logoHeight: 532,
        },
    ];
    const learningSteps = [
        {
            title: fields["home-024"],
            description: fields["home-025"],
        },
        {
            title: fields["home-026"],
            description: fields["home-027"],
        },
        {
            title: fields["home-028"],
            description: fields["home-029"],
        },
    ];
    const communityLinks = [
        {
            href: fields["home-030"],
            title: fields["home-031"],
            description: fields["home-032"],
            image: fields["home-033"],
            imageAlt: fields["home-034"],
            action: fields["home-035"],
        },
        {
            href: fields["home-036"],
            title: fields["home-037"],
            description: fields["home-038"],
            image: fields["home-039"],
            imageAlt: fields["home-040"],
            action: fields["home-041"],
        },
        {
            href: fields["home-042"],
            title: fields["home-043"],
            description: fields["home-044"],
            image: fields["home-045"],
            imageAlt: fields["home-046"],
            action: fields["home-047"],
        },
    ];
    const studentTestimonials = [
        {
            quote: fields["home-048"],
            name: fields["home-049"],
            detail: fields["home-050"],
            image: fields["home-051"],
            imageAlt: fields["home-052"],
        },
        {
            quote: fields["home-053"],
            name: fields["home-054"],
            detail: fields["home-055"],
            image: fields["home-056"],
            imageAlt: fields["home-057"],
        },
        {
            quote: fields["home-058"],
            name: fields["home-059"],
            detail: fields["home-060"],
            image: fields["home-061"],
            imageAlt: fields["home-062"],
        },
        {
            quote: fields["home-063"],
            name: fields["home-064"],
            detail: fields["home-065"],
            image: fields["home-066"],
            imageAlt: fields["home-067"],
        },
        {
            quote: fields["home-068"],
            name: fields["home-069"],
            detail: fields["home-070"],
            image: fields["home-071"],
            imageAlt: fields["home-072"],
        },
    ];
    const teacherTestimonials = [
        {
            quote: fields["home-073"],
            name: fields["home-074"],
            detail: fields["home-075"],
            image: fields["home-076"],
            imageAlt: fields["home-077"],
        },
        {
            quote: fields["home-078"],
            name: fields["home-079"],
            detail: fields["home-080"],
            image: fields["home-081"],
            imageAlt: fields["home-082"],
        },
        {
            quote: fields["home-083"],
            name: fields["home-084"],
            detail: fields["home-085"],
            image: fields["home-086"],
            imageAlt: fields["home-087"],
        },
        {
            quote: fields["home-088"],
            name: fields["home-089"],
            detail: fields["home-090"],
            image: fields["home-091"],
            imageAlt: fields["home-092"],
        },
        {
            quote: fields["home-093"],
            name: fields["home-094"],
            detail: fields["home-095"],
            image: fields["home-096"],
            imageAlt: fields["home-097"],
        },
    ];
    return { milestones, partners, learningSteps, communityLinks, studentTestimonials, teacherTestimonials };
}
