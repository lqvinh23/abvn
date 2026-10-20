import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { label: "About Us", href: "/about" },
  { label: "News", href: "/news" },
  { label: "Our Volunteer Teachers", href: "/teachers" },
  { label: "Become a Teacher", href: "/apply" },
  { label: "Become a Student", href: "/student-apply" },
];

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

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <div className="max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-xl font-bold tracking-tight text-white"
          >
            <Image
              src="/abvn-logo.png"
              alt="A Better Vietnam"
              width={150}
              height={50}
              className="h-auto w-[150px] rounded bg-white p-1"
            />
          </Link>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Connecting young people in Vietnam with volunteer teachers for free
            English lessons and meaningful cultural exchange.
          </p>
          <nav aria-label="Social media" className="mt-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Follow our community
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-300 transition-colors hover:text-green-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-400"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Quick Links
          </h2>
          <ul className="mt-5 flex flex-col gap-3 text-sm font-medium">
            {footerLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-slate-300 transition-colors hover:text-green-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-400"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Contact
          </h2>
          <ul className="mt-5 flex flex-col gap-4 text-sm leading-6 text-slate-300">
            <li>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                General inquiries
              </span>
              <a
                href="mailto:abettervnproject@gmail.com"
                className="mt-1 inline-block break-all transition-colors hover:text-green-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                abettervnproject@gmail.com
              </a>
            </li>
            <li>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Human resources
              </span>
              <a
                href="mailto:abettervietnam.ia@gmail.com"
                className="mt-1 inline-block break-all transition-colors hover:text-green-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                abettervietnam.ia@gmail.com
              </a>
            </li>
            <li>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Education affairs
              </span>
              <a
                href="mailto:abettervietnam.ea@gmail.com"
                className="mt-1 inline-block break-all transition-colors hover:text-green-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                abettervietnam.ea@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; A Better Vietnam. All rights reserved.</p>
          <p>Better English - Better Future</p>
        </div>
      </div>
    </footer>
  );
}
