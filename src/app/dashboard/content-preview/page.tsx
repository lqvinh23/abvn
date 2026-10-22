import { Suspense } from "react";
import { requireMember } from "@/src/lib/platform/auth";
import ContentPreview from "@/src/components/content/ContentPreview";
import { connection } from "next/server";

async function PrivatePreview() {
  await connection();
  await requireMember("admin");
  return <ContentPreview />;
}

export default function ContentPreviewPage() {
  return <Suspense fallback={<p className="p-6">Checking admin access...</p>}><PrivatePreview /></Suspense>;
}
