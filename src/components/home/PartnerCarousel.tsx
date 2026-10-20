"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Partner = {
  name: string;
  relationship: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
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

export default function PartnerCarousel({ partners }: { partners: Partner[] }) {
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
    setScrollPositionImmediately(track, step * partners.length);
  }, [partners.length]);

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
    const cardCount = partners.length;
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
    <div className="mt-9 border-y border-slate-200">
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          aria-label="Previous partners"
          onClick={() => move("left")}
          className="flex size-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          aria-label="Next partners"
          onClick={() => move("right")}
          className="flex size-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-label="A Better Vietnam partners and program support"
        className="scrollbar-hide flex snap-x snap-mandatory gap-8 overflow-x-auto py-5"
      >
        {[-1, 0, 1].flatMap((copy) =>
          partners.map(({ name, relationship, logo, logoWidth, logoHeight }, index) => (
            <article
              key={`${copy}-${name}-${index}`}
              aria-hidden={copy !== 0}
              className="flex w-[min(76vw,15rem)] shrink-0 snap-start flex-col justify-between gap-5 sm:w-[15rem]"
            >
              <div className="flex h-14 items-center">
                <Image
                  src={logo}
                  alt={copy === 0 ? name : ""}
                  width={logoWidth}
                  height={logoHeight}
                  className="max-h-12 w-auto max-w-[12rem] object-contain object-left"
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-5 text-slate-900">
                  {name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{relationship}</p>
              </div>
            </article>
          )),
        )}
      </div>
    </div>
  );
}
