import { Suspense } from "react";
import { io } from "next/cache";
import HomeContent from "@/src/components/content/HomeContent";
import RouteLoading from "@/src/components/RouteLoading";
import { getPageContent } from "@/src/lib/content/server";

async function PublishedHome() {
  await io();
  return <HomeContent content={await getPageContent("home")} />;
}

export default function Home() {
  return <Suspense fallback={<RouteLoading variant="page" />}><PublishedHome /></Suspense>;
}
