import { Suspense } from "react";
import { requireMember } from "@/src/lib/platform/auth";
import ContentPreview from "@/src/components/content/ContentPreview";
import { connection } from "next/server";
import { InlineLoading } from "@/src/components/RouteLoading";

async function PrivatePreview() {
  await connection();
  await requireMember("admin");
  return <ContentPreview />;
}

export default function ContentPreviewPage() {
  return <Suspense fallback={<InlineLoading label="Checking administrator access" />}><PrivatePreview /></Suspense>;
}
