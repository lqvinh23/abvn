import ContentSections from "./ContentSections";
import type { PageContent } from "@/src/lib/content/schema";
import Image from "next/image";
import Link from "next/link";
import JourneyTimeline from "@/src/components/about/JourneyTimeline";
import SdgExplorer from "@/src/components/about/SdgExplorer";
export default function AboutPage({ content }: {
    content: PageContent;
}) {
    return (<main className="flex-1"><ContentSections order={content.sections} sections={{
            "about-section-1": (<AboutIntroduction content={content}/>),
            "about-section-2": (<AboutProgram content={content}/>),
            "about-section-3": (<AboutValues content={content}/>),
            "about-section-4": (<AboutCommitments content={content}/>),
            "about-section-5": (<AboutJourney content={content}/>),
            "about-section-6": (<AboutPeople content={content}/>),
            "about-section-7": (<AboutInvitation content={content}/>)
        }}/></main>);
}
function AboutIntroduction({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    return (<>
      <section aria-labelledby="about-heading" className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              {fields["about-051"]}</p>
            <h1 id="about-heading" className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {fields["about-052"]}<span className="block text-(--primary)">{fields["about-053"]}</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              {fields["about-054"]}</p>
            <nav aria-label="On this page" className="mt-7">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-(--primary)">
                {[
            { href: fields["about-055"], label: fields["about-056"] },
            { href: fields["about-057"], label: fields["about-058"] },
            { href: fields["about-059"], label: fields["about-060"] },
            { href: fields["about-061"], label: fields["about-062"] },
        ].map(({ href, label }) => (<li key={href}>
                    <a href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                      {label}
                    </a>
                  </li>))}
              </ul>
            </nav>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[25rem]">
            <Image unoptimized src={fields["about-063"]} alt={fields["about-064"]} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover"/>
          </div>
        </div>
      </section>

      <section id="our-story" aria-labelledby="story-heading" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              {fields["about-065"]}</p>
            <h2 id="story-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {fields["about-066"]}</h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-slate-700">
            <p>
              {fields["about-067"]}</p>
            <p>
              {fields["about-068"]}</p>
            <p>
              {fields["about-069"]}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="mission-heading" className="bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative min-h-72 overflow-hidden rounded-3xl sm:min-h-[28rem]">
            <Image unoptimized src={fields["about-070"]} alt={fields["about-071"]} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"/>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              {fields["about-072"]}</p>
            <h2 id="mission-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {fields["about-073"]}</h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              {fields["about-074"]}</p>
            <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  {fields["about-075"]}</span>
                {fields["about-076"]}</li>
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  {fields["about-077"]}</span>
                {fields["about-078"]}</li>
              <li className="flex gap-3">
                <span className="font-bold text-(--primary)" aria-hidden="true">
                  {fields["about-079"]}</span>
                {fields["about-080"]}</li>
            </ul>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              {fields["about-081"]}</p>
          </div>
        </div>
      </section>
    </>);
}
function AboutPeople({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    const { foundingTeachers, teams } = getContentData(fields);
    return (<section id="our-people" aria-labelledby="people-heading" className="scroll-mt-28 bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
            {fields["about-082"]}</p>
          <h2 id="people-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {fields["about-083"]}</h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            {fields["about-084"]}</p>
        </div>
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              {fields["about-085"]}</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {fields["about-086"]}</h3>
            <p className="mt-6 text-base font-semibold text-(--primary)">
              {fields["about-087"]}<span className="text-slate-500">{fields["about-088"]}</span>
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              {fields["about-089"]}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-(--muted) lg:aspect-[5/4]">
            <Image unoptimized src={fields["about-090"]} alt={fields["about-091"]} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"/>
          </div>
        </div>

        <div className="mt-14 border-t border-slate-200 pt-10 sm:mt-16 sm:pt-12">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                {fields["about-092"]}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {fields["about-093"]}</h3>
            </div>
            <p className="max-w-xl text-lg leading-8 text-slate-700">
              {fields["about-094"]}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {foundingTeachers.map(({ name, image }) => (<article key={name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative h-64 bg-(--muted)">
                  <Image unoptimized src={image} alt={fields["about-095"]} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover"/>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {name}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {fields["about-096"]}</p>
                </div>
              </article>))}
          </div>
        </div>

        <div className="mt-14 border-t border-slate-200 pt-10 sm:mt-16 sm:pt-12">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
                {fields["about-097"]}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {fields["about-098"]}</h3>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              {fields["about-099"]}</p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {teams.map(({ title, description, leader, members, image }) => (<article key={title} className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-4 p-5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-(--muted)">
                    <Image unoptimized src={image} alt={fields["about-100"]} fill sizes="64px" className="object-cover"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900">{leader}</h4>
                    <p className="text-sm text-slate-700">{fields["about-101"]}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 px-6 py-5">
                  <p className="text-lg font-bold text-(--primary)">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {description}
                  </p>
                  <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {fields["about-102"]}</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {members.map(({ name, image }) => (<li key={name} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-(--muted)">
                          <Image unoptimized src={image} alt={fields["about-103"]} fill sizes="48px" className="object-cover"/>
                        </div>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {name}
                          </span>
                        </span>
                      </li>))}
                  </ul>
                </div>
              </article>))}
          </div>
        </div>
        <Link href={fields["about-104"]} className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
          {fields["about-105"]}<span aria-hidden="true">{fields["about-106"]}</span>
        </Link>
      </div>
    </section>);
}
function AboutProgram({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    return (<section id="our-programme" aria-labelledby="programme-heading" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            {fields["about-107"]}</p>
          <h2 id="programme-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {fields["about-108"]}</h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            {fields["about-109"]}</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-7 sm:p-9">
            <h3 className="text-2xl font-semibold text-(--primary)">
              {fields["about-110"]}</h3>
            <p className="mt-4 text-base leading-7 text-slate-700">
              {fields["about-111"]}</p>
            <Link href={fields["about-112"]} className="mt-6 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
              {fields["about-113"]}</Link>
          </article>
          <article className="rounded-2xl border border-slate-200 p-7 sm:p-9">
            <h3 className="text-2xl font-semibold text-(--primary)">
              {fields["about-114"]}</h3>
            <p className="mt-4 text-base leading-7 text-slate-700">
              {fields["about-115"]}</p>
            <Link href={fields["about-116"]} className="mt-6 inline-flex min-h-11 items-center font-semibold text-(--primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
              {fields["about-117"]}</Link>
          </article>
        </div>
      </div>
    </section>);
}
function AboutValues({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    const { values } = getContentData(fields);
    return (<section id="our-values" aria-labelledby="values-heading" className="scroll-mt-28 bg-(--muted) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            {fields["about-118"]}</p>
          <h2 id="values-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {fields["about-119"]}</h2>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {values.map(({ title, description }) => (<article key={title} className="rounded-2xl bg-white p-7 sm:p-8">
              <h3 className="text-xl font-semibold text-(--primary)">
                {title}
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {description}
              </p>
            </article>))}
        </div>
      </div>
    </section>);
}
function AboutJourney({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    return (<section aria-labelledby="journey-heading" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              {fields["about-120"]}</p>
            <h2 id="journey-heading" className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {fields["about-121"]}</h2>
          </div>
          <p className="max-w-md text-base leading-7 text-slate-600">
            {fields["about-122"]}</p>
        </div>
        <JourneyTimeline content={content}/>
      </div>
    </section>);
}
function AboutCommitments({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    const { commitments } = getContentData(fields);
    return (<section aria-labelledby="commitments-heading" className="border-b border-slate-200 bg-(--muted) px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            {fields["about-123"]}</p>
          <h2 id="commitments-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {fields["about-124"]}</h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            {fields["about-125"]}</p>
        </div>
        <SdgExplorer content={content}/>
        <h3 className="mt-10 text-xl font-semibold text-slate-950">
          {fields["about-126"]}</h3>
        <ul className="mt-5 grid gap-3 text-base leading-7 text-slate-700 sm:grid-cols-2">
          {commitments.map((commitment) => (<li key={commitment} className="flex gap-3">
              <span className="font-bold text-(--primary)" aria-hidden="true">
                {fields["about-127"]}</span>
              {commitment}
            </li>))}
        </ul>
      </div>
    </section>);
}
function AboutInvitation({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    return (<section aria-labelledby="join-heading" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl bg-(--primary) px-7 py-10 text-white sm:px-12 sm:py-14">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">
              {fields["about-128"]}</p>
            <h2 id="join-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {fields["about-129"]}</h2>
            <p className="mt-4 text-lg leading-8 text-white/90">
              {fields["about-130"]}</p>
            <p className="mt-5 text-sm leading-6 text-white/90">
              {fields["about-131"]}{" "}
              <a href={fields["about-132"]} className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {fields["about-133"]}</a>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={fields["about-134"]} className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 py-3 text-center font-semibold text-(--primary) transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {fields["about-135"]}</Link>
            <Link href={fields["about-136"]} className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {fields["about-137"]}</Link>
          </div>
        </div>
      </div>
    </section>);
}
function getContentData(fields: Record<string, string>) {
    const values = [
        {
            title: fields["about-001"],
            description: fields["about-002"],
        },
        {
            title: fields["about-003"],
            description: fields["about-004"],
        },
        {
            title: fields["about-005"],
            description: fields["about-006"],
        },
    ];
    const commitments = [
        fields["about-007"],
        fields["about-008"],
        fields["about-009"],
        fields["about-010"],
    ];
    const foundingTeachers = [
        {
            name: fields["about-011"],
            image: fields["about-012"],
        },
        {
            name: fields["about-013"],
            image: fields["about-014"],
        },
        { name: fields["about-015"], image: fields["about-016"] },
    ];
    const teams = [
        {
            title: fields["about-017"],
            description: fields["about-018"],
            leader: fields["about-019"],
            image: fields["about-020"],
            members: [
                { name: fields["about-021"], image: fields["about-022"] },
                { name: fields["about-023"], image: fields["about-024"] },
                { name: fields["about-025"], image: fields["about-026"] },
                { name: fields["about-027"], image: fields["about-028"] },
            ],
        },
        {
            title: fields["about-029"],
            description: fields["about-030"],
            leader: fields["about-031"],
            image: fields["about-032"],
            members: [
                { name: fields["about-033"], image: fields["about-034"] },
                { name: fields["about-035"], image: fields["about-036"] },
                { name: fields["about-037"], image: fields["about-038"] },
            ],
        },
        {
            title: fields["about-039"],
            description: fields["about-040"],
            leader: fields["about-041"],
            image: fields["about-042"],
            members: [
                { name: fields["about-043"], image: fields["about-044"] },
                { name: fields["about-045"], image: fields["about-046"] },
                { name: fields["about-047"], image: fields["about-048"] },
                { name: fields["about-049"], image: fields["about-050"] },
            ],
        },
    ];
    return { values, commitments, foundingTeachers, teams };
}
