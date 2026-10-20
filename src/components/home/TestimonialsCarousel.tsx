"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Testimonial = {
  quote: string;
  name: string;
  detail: string;
  image: string;
  imageAlt: string;
};

type TestimonialsCarouselProps = {
  title: string;
  testimonials: Testimonial[];
  id: string;
};

function setScrollPositionImmediately(track: HTMLDivElement, position: number) {
  const scrollBehavior = track.style.scrollBehavior;
  track.style.scrollBehavior = "auto";
  track.scrollLeft = position;
  track.style.scrollBehavior = scrollBehavior;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
    >
      {direction === "left" ? (
        <path
          d="M19 12H5m0 0 7 7m-7-7 7-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5 12h14m0 0-7-7m7 7-7 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function TestimonialsCarousel({
  title,
  testimonials,
  id,
}: TestimonialsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;
    const secondCard = firstCard?.nextElementSibling;

    if (
      !(track instanceof HTMLDivElement) ||
      !(firstCard instanceof HTMLElement) ||
      !(secondCard instanceof HTMLElement)
    ) {
      return;
    }

    const step =
      secondCard.getBoundingClientRect().left -
      firstCard.getBoundingClientRect().left;
    setScrollPositionImmediately(track, step * testimonials.length);
  }, [testimonials.length]);

  function move(direction: "left" | "right") {
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;

    if (!(track instanceof HTMLDivElement) || !(firstCard instanceof HTMLElement)) {
      return;
    }

    const secondCard = firstCard.nextElementSibling;
    const step = secondCard
      ? secondCard.getBoundingClientRect().left -
        firstCard.getBoundingClientRect().left
      : firstCard.getBoundingClientRect().width;
    const cardCount = testimonials.length;
    let currentIndex = Math.round(track.scrollLeft / step);

    if (direction === "right" && currentIndex >= cardCount * 2 - 1) {
      currentIndex -= cardCount;
      setScrollPositionImmediately(track, currentIndex * step);
    } else if (direction === "left" && currentIndex <= cardCount) {
      currentIndex += cardCount;
      setScrollPositionImmediately(track, currentIndex * step);
    }

    track.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth",
    });
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3
          id={`${id}-heading`}
          className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
        >
          {title}
        </h3>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label={`Previous ${title.toLowerCase()}`}
            onClick={() => move("left")}
            className="flex size-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label={`Next ${title.toLowerCase()}`}
            onClick={() => move("right")}
            className="flex size-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        aria-label={title}
        className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-3"
      >
        {[-1, 0, 1].flatMap((copy) =>
          testimonials.map(({ quote, name, detail, image, imageAlt }, index) => (
            <article
              key={`${copy}-${index}`}
              aria-hidden={copy !== 0}
              className="w-[min(86vw,23rem)] shrink-0 snap-start border-t border-slate-200 pt-5 sm:w-[min(70vw,23rem)] md:w-[calc((100%-2.5rem)/3)]"
            >
              <blockquote className="min-h-32 text-base leading-7 text-slate-700 sm:text-lg">
                “{quote}”
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-(--muted)">
                  <Image
                    src={image}
                    alt={copy === 0 ? imageAlt : ""}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{detail}</p>
                </div>
              </div>
            </article>
          )),
        )}
      </div>
    </section>
  );
}
