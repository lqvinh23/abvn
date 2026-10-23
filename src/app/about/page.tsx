import { Suspense } from "react";
import AboutContent from "@/src/components/content/AboutContent";
import RouteLoading from "@/src/components/RouteLoading";
import { getPageContent } from "@/src/lib/content/server";

export const metadata = {
  title: "About Us | A Better Vietnam",
  description: "Learn about A Better Vietnam's story, mission, values, and commitment to accessible English education.",
};

async function PublishedAbout() {
  return <AboutContent content={await getPageContent("about")} />;
}

export default function AboutPage() {
  return <Suspense fallback={<RouteLoading variant="page" />}><PublishedAbout /></Suspense>;
}
