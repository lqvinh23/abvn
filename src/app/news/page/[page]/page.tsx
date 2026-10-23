import { notFound } from "next/navigation";
import NewsListing from "@/src/components/news/NewsListing";
import NewsPageHeader from "@/src/components/news/NewsPageHeader";
import { getPageItems } from "@/src/lib/content-pagination";
import { newsArticles } from "@/src/lib/news-articles";
import { getNewsContent } from "@/src/lib/content/server";
import { Suspense } from "react";
import RouteLoading from "@/src/components/RouteLoading";

const totalPages = getPageItems(newsArticles, 1).totalPages;

export const metadata = {
  title: "News & Learning Resources | A Better Vietnam",
};

export function generateStaticParams() {
  return Array.from({ length: totalPages - 1 }, (_, index) => ({
    page: String(index + 2),
  }));
}

async function PublishedNewsPage({
  params,
}: PageProps<"/news/page/[page]">) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);
  const { articles } = await getNewsContent();
  const totalPages = getPageItems(articles, 1).totalPages;

  if (
    !Number.isInteger(page) ||
    page < 2 ||
    page > totalPages ||
    String(page) !== pageParam
  ) {
    notFound();
  }

  return (
    <main className="flex-1">
      <NewsPageHeader />
      <NewsListing page={page} />
    </main>
  );
}

export default function PaginatedNewsPage(props: PageProps<"/news/page/[page]">) {
  return <Suspense fallback={<RouteLoading variant="page" />}><PublishedNewsPage {...props} /></Suspense>;
}
