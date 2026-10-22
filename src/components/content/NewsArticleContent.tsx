import Image from "next/image";
import Link from "next/link";
import type { EditableArticle } from "@/src/lib/content/schema";
import ArticleRichText from "./ArticleRichText";
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function NewsArticleContent({ article }: { article: EditableArticle }) {
  return (
    <main className="flex-1">
      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/news"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            ← Back to all news
          </Link>
          <article className="mt-8">
            <header>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-bold uppercase tracking-[0.12em] text-(--primary)">
                  {article.category}
                </span>
                <time dateTime={article.date}>
                  {dateFormatter.format(new Date(article.date))}
                </time>
                {article.publisher_name ? <span>By {article.publisher_name}</span> : null}
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {article.title}
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                {article.summary}
              </p>
            </header>

            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-(--muted)">
              <Image unoptimized
                src={article.image}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
            </div>

            <div className="mx-auto mt-8 max-w-3xl space-y-6 text-base leading-8 text-slate-700 sm:text-lg">
              {article.richText ? <ArticleRichText node={article.richText} title={article.title} /> : article.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </article>

          <div className="mx-auto mt-10 max-w-3xl border-t border-slate-200 pt-6">
            <Link
              href="/news"
              className="inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              ← Back to all news
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
