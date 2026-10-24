import Link from "next/link";
import Image from "next/image";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "News", href: "/news" },
  { label: "Our Volunteer Teachers", href: "/teachers" },
  { label: "Become a Teacher", href: "/apply" },
  { label: "Become a Student", href: "/student-apply" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:px-6 lg:gap-x-6 lg:px-8">
        <Link
          href="/"
          aria-label="A Better Vietnam home"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/abvn-logo.png"
            alt="A Better Vietnam"
            width={125}
            height={42}
            priority
            className="h-auto w-[104px] sm:w-[125px]"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden flex-1 lg:block">
          <ul className="flex items-center justify-center gap-4 text-sm font-medium xl:gap-6">
            {navigationLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="whitespace-nowrap text-slate-700 transition-colors hover:text-(--primary) focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--primary)"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/dashboard"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:min-h-11 sm:px-5 sm:text-base"
        >
          Login<span className="hidden sm:inline"> / Dashboard</span>
        </Link>

        <details className="group relative lg:hidden">
          <summary
            aria-label="Open navigation menu"
            className="button-secondary flex size-10 cursor-pointer list-none items-center justify-center rounded-md border transition-colors [&::-webkit-details-marker]:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-5 group-open:hidden"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="hidden size-5 group-open:block"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            <ul className="flex flex-col">
              {navigationLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-(--muted) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--primary)"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
