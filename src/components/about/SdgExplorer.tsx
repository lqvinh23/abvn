"use client";

import Image from "next/image";
import { useState } from "react";

const goals = [
  {
    number: "04",
    shortName: "QUALITY EDUCATION",
    title: "Quality education",
    description:
      "Free one-to-one English lessons help learners access education that supports communication and lifelong learning.",
    detail:
      "ABVN’s core program pairs motivated Vietnamese learners with volunteer teachers for online English lessons.",
    image: "/images/english-classroom.jpg",
    imageAlt: "A student learning in a classroom",
    icon: "book",
    color: "bg-[#c5192d]",
  },
  {
    number: "10",
    shortName: "REDUCED INEQUALITIES",
    title: "Reduced inequalities",
    description:
      "The project focuses on learners who may face barriers to quality English education and global connections.",
    detail:
      "By making lessons free and accessible online, ABVN works to reduce barriers to learning opportunities.",
    image: "/images/student-community.jpg",
    imageAlt: "Students supporting one another in a learning community",
    icon: "equal",
    color: "bg-[#dd1367]",
  },
  {
    number: "17",
    shortName: "PARTNERSHIPS FOR THE GOALS",
    title: "Partnerships for the goals",
    description:
      "Volunteer teachers and collaborators from different places work together to support young people.",
    detail:
      "ABVN’s international network connects educators, learners, and partners around a shared purpose.",
    image: "/images/global-learning.jpg",
    imageAlt: "People working together as a global community",
    icon: "people",
    color: "bg-[#19486a]",
  },
];

function GoalIcon({ name }: { name: string }) {
  if (name === "book") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        fill="none"
        className="size-10"
      >
        <path
          d="M6 11.5c7.3-2 13.3-.7 18 3.2v26c-4.7-3.9-10.7-5.2-18-3.2v-26Zm36 0c-7.3-2-13.3-.7-18 3.2v26c4.7-3.9 10.7-5.2 18-3.2v-26Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M12 20c3.4-.5 6.2.1 8.5 1.8M12 27c3.4-.5 6.2.1 8.5 1.8m15-8.8c-3.4-.5-6.2.1-8.5 1.8m8.5 5.2c-3.4-.5-6.2.1-8.5 1.8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "equal") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        fill="none"
        className="size-10"
      >
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M14 19h20M14 29h20"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className="size-10"
    >
      <circle cx="18" cy="15" r="6" stroke="currentColor" strokeWidth="3" />
      <circle cx="34" cy="19" r="5" stroke="currentColor" strokeWidth="3" />
      <path
        d="M6 38c0-7 5.4-12 12-12s12 5 12 12m-1-9c1.5-1.3 3.2-2 5-2 5 0 8 4 8 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SdgExplorer() {
  const [activeGoal, setActiveGoal] = useState(0);
  const selectedGoal = goals[activeGoal];

  return (
    <div className="mt-10 grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
      <div
        role="group"
        aria-label="Select a Sustainable Development Goal"
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
      >
        {goals.map((goal, index) => {
          const isSelected = index === activeGoal;

          return (
            <button
              key={goal.number}
              type="button"
              aria-pressed={isSelected}
              aria-controls="sdg-detail"
              onClick={() => setActiveGoal(index)}
              className={`flex min-h-24 items-center gap-4 rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:min-h-32 sm:flex-col sm:items-start sm:justify-between lg:min-h-28 lg:flex-row lg:items-center ${
                isSelected
                  ? "border-(--primary) bg-green-50 shadow-sm ring-2 ring-green-800/10"
                  : "border-slate-200 bg-white hover:border-(--primary)"
              }`}
            >
              <span
                className={`flex size-14 shrink-0 items-center justify-center rounded-lg text-white ${goal.color}`}
              >
                <GoalIcon name={goal.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold tracking-wider text-slate-500">
                  UN SDG {goal.number}
                </span>
                <span className="mt-1 block text-sm font-bold leading-5 text-slate-900">
                  {goal.shortName}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`hidden text-xl font-semibold sm:block ${
                  isSelected ? "text-(--primary)" : "text-slate-300"
                }`}
              >
                →
              </span>
            </button>
          );
        })}
      </div>

      <article
        id="sdg-detail"
        aria-live="polite"
        className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[0.85fr_1.15fr]"
      >
        <div className="relative min-h-52 sm:min-h-full">
          <Image
            key={selectedGoal.image}
            src={selectedGoal.image}
            alt={selectedGoal.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            UN Sustainable Development Goal {selectedGoal.number}
          </p>
          <h3 className="mt-3 text-2xl font-bold text-slate-950">
            {selectedGoal.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {selectedGoal.description}
          </p>
          <p className="mt-4 border-l-4 border-(--primary) pl-4 text-base leading-7 text-slate-700">
            {selectedGoal.detail}
          </p>
        </div>
      </article>
    </div>
  );
}
