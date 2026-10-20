import Link from "next/link";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/a-better-vietnam",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/a_better_vietnam/",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCd1MvLDKJhK2odFskFqF4MA",
  },
];

export default function NewsListing() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Stay connected with A Better Vietnam.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
            Follow our social channels for the latest news and community
            updates.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {socialLinks.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 py-2 font-semibold text-(--primary) transition-colors hover:border-(--primary) hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-(--primary) px-4 py-2 font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                About ABVN
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
