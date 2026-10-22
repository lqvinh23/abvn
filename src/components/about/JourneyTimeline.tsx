"use client";
import type { PageContent } from "@/src/lib/content/schema";
import Image from "next/image";
import { useState } from "react";
export default function JourneyTimeline({ content }: {
    content: PageContent;
}) {
    const fields = content.fields;
    const { milestones } = getContentData(fields);
    const [activeIndex, setActiveIndex] = useState(0);
    const activeMilestone = milestones[activeIndex];
    return (<div className="mt-10 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
      <div>
        <ol aria-label="A Better Vietnam milestones" className="grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-3">
          {milestones.map(({ year, title }, index) => {
            const isActive = index === activeIndex;
            return (<li key={year}>
                <button type="button" aria-pressed={isActive} aria-controls="journey-milestone-detail" onClick={() => setActiveIndex(index)} className={`flex min-h-14 w-full flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:min-h-16 lg:flex-row lg:justify-start lg:gap-5 lg:px-5 ${isActive
                    ? "border-(--primary) bg-(--primary) text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-(--primary) hover:text-(--primary)"}`}>
                  <span className="text-base font-bold sm:text-lg">{year}</span>
                  <span className="hidden text-left text-sm font-medium lg:block">
                    {title}
                  </span>
                </button>
              </li>);
        })}
        </ol>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {fields["journey-031"]}</p>
      </div>

      <article id="journey-milestone-detail" aria-live="polite" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative min-h-64 sm:min-h-80">
          <Image unoptimized key={activeMilestone.image} src={activeMilestone.image} alt={activeMilestone.imageAlt} fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent"/>
          <p className="absolute bottom-5 left-5 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-(--primary) sm:bottom-7 sm:left-7">
            {activeMilestone.marker}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            {activeMilestone.year}
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {activeMilestone.title}
          </h3>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            {activeMilestone.description}
          </p>
        </div>
      </article>
    </div>);
}
function getContentData(fields: Record<string, string>) {
    const milestones = [
        {
            year: fields["journey-001"],
            title: fields["journey-002"],
            description: fields["journey-003"],
            image: fields["journey-004"],
            imageAlt: fields["journey-005"],
            marker: fields["journey-006"],
        },
        {
            year: fields["journey-007"],
            title: fields["journey-008"],
            description: fields["journey-009"],
            image: fields["journey-010"],
            imageAlt: fields["journey-011"],
            marker: fields["journey-012"],
        },
        {
            year: fields["journey-013"],
            title: fields["journey-014"],
            description: fields["journey-015"],
            image: fields["journey-016"],
            imageAlt: fields["journey-017"],
            marker: fields["journey-018"],
        },
        {
            year: fields["journey-019"],
            title: fields["journey-020"],
            description: fields["journey-021"],
            image: fields["journey-022"],
            imageAlt: fields["journey-023"],
            marker: fields["journey-024"],
        },
        {
            year: fields["journey-025"],
            title: fields["journey-026"],
            description: fields["journey-027"],
            image: fields["journey-028"],
            imageAlt: fields["journey-029"],
            marker: fields["journey-030"],
        },
    ];
    return { milestones };
}
