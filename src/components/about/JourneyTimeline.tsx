"use client";

import Image from "next/image";
import { useState } from "react";

const milestones = [
  {
    year: "2017",
    title: "A small beginning",
    description:
      "ABVN started with three volunteer teachers and a shared belief that small actions can create lasting change.",
    image: "/images/volunteer-team.jpg",
    imageAlt: "Volunteers coming together to support a shared mission",
    marker: "The first lessons",
  },
  {
    year: "2019",
    title: "Growing together",
    description:
      "The program grew to 10 teachers, 170 students, and more than 2,300 lessons.",
    image: "/images/english-classroom.jpg",
    imageAlt: "Students taking part in a classroom lesson",
    marker: "10 teachers · 170 students",
  },
  {
    year: "2020",
    title: "Regional recognition",
    description:
      "ABVN was selected as one of 20 Southeast Asian projects for the YSEALI Seeds for the Future program.",
    image: "/images/learning-community.jpg",
    imageAlt: "Learners sharing ideas and studying together",
    marker: "YSEALI Seeds for the Future",
  },
  {
    year: "2021",
    title: "Reaching more learners",
    description:
      "With 35 teachers, the program expanded to include students in Laos and Cambodia.",
    image: "/images/global-learning.jpg",
    imageAlt: "People learning and collaborating across cultures",
    marker: "Vietnam · Laos · Cambodia",
  },
  {
    year: "2024",
    title: "An international community",
    description:
      "The network had grown to more than 100 volunteer teachers, 1,000 students, and 25,000 lessons.",
    image: "/images/student-community.jpg",
    imageAlt: "A group of students learning and growing together",
    marker: "100+ teachers · 1,000+ learners",
  },
];

export default function JourneyTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMilestone = milestones[activeIndex];

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
      <div>
        <ol
          aria-label="A Better Vietnam milestones"
          className="grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-3"
        >
          {milestones.map(({ year, title }, index) => {
            const isActive = index === activeIndex;

            return (
              <li key={year}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-controls="journey-milestone-detail"
                  onClick={() => setActiveIndex(index)}
                  className={`flex min-h-14 w-full flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:min-h-16 lg:flex-row lg:justify-start lg:gap-5 lg:px-5 ${
                    isActive
                      ? "border-(--primary) bg-(--primary) text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-(--primary) hover:text-(--primary)"
                  }`}
                >
                  <span className="text-base font-bold sm:text-lg">{year}</span>
                  <span className="hidden text-left text-sm font-medium lg:block">
                    {title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Select a year to explore a milestone in ABVN’s journey.
        </p>
      </div>

      <article
        id="journey-milestone-detail"
        aria-live="polite"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="relative min-h-64 sm:min-h-80">
          <Image
            key={activeMilestone.image}
            src={activeMilestone.image}
            alt={activeMilestone.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 65vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
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
    </div>
  );
}
