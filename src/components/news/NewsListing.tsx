import { getNewsContent } from "@/src/lib/content/server";
import NewsListingContent from "./NewsListingContent";

export default async function NewsListing({ page }: { page: number }) {
  const { articles } = await getNewsContent();
  return <NewsListingContent articles={articles} page={page} />;
}
