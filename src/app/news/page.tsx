import NewsListing from "@/src/components/news/NewsListing";
import NewsPageHeader from "@/src/components/news/NewsPageHeader";

export const metadata = {
  title: "News & Learning Resources | A Better Vietnam",
  description: "News and updates from A Better Vietnam.",
};

export default function NewsPage() {
  return (
    <main className="flex-1">
      <NewsPageHeader />
      <NewsListing />
    </main>
  );
}
