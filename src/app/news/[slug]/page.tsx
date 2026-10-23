import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getNewsContent } from "@/src/lib/content/server";
import NewsArticleContent from "@/src/components/content/NewsArticleContent";
import RouteLoading from "@/src/components/RouteLoading";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const { articles } = await getNewsContent();
  const article = articles.find(item => item.slug === slug);
  return {
    title: article ? `${article.title} | A Better Vietnam` : "News | A Better Vietnam",
    description: article?.summary ?? "News and updates from A Better Vietnam.",
    authors: article?.publisher_name ? [{ name: article.publisher_name }] : undefined,
  };
}

async function PublishedArticle({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const { articles } = await getNewsContent();
  const article = articles.find(item => item.slug === slug);
  if (!article) notFound();
  return <NewsArticleContent article={article} />;
}

export default function NewsArticlePage(props: PageProps<"/news/[slug]">) {
  return <Suspense fallback={<RouteLoading variant="page" />}><PublishedArticle {...props} /></Suspense>;
}
