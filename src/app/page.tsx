import { Suspense } from "react";
import HomeContent from "@/src/components/content/HomeContent";
import { getPageContent } from "@/src/lib/content/server";

async function PublishedHome() {
  return <HomeContent content={await getPageContent("home")} />;
}

export default function Home() {
  return <Suspense fallback={<main className="min-h-96 p-12" aria-busy="true">Loading A Better Vietnam...</main>}><PublishedHome /></Suspense>;
}
