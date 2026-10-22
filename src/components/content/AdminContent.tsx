import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { upgradeNewsVisibility, validateContent } from "@/src/lib/content/schema";
import ContentEditor from "./ContentEditor";

export default async function AdminContent() {
  const supabase = await createSupabaseServerClient();
  const [{ data: documents, error }, { data: media, error: mediaError }] = await Promise.all([
    supabase.from("content_documents").select("*").order("key"),
    supabase.storage.from("web-content").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
  ]);
  if (error || mediaError) {
    console.error("Web content editor load failed:", error?.code ?? mediaError?.name);
    if (["42P01","PGRST205"].includes(error?.code ?? "")) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-semibold">Enable the website content editor</h2><p className="mt-3 leading-7">Run 202610210008_web_content.sql once in Supabase SQL Editor after migrations 001–007, then refresh this page. It imports the current website content and news without changing members, lessons or feedback.</p></section>;
    throw new Error("The content editor could not be loaded. Check the web content migration and retry.");
  }
  if (!documents || !["home","about","news"].every(key => documents.some(doc => doc.key === key))) throw new Error("Website content is incomplete. Apply the web content migration.");
  const editorDocuments = documents.map(document => ({ ...document, draft: upgradeNewsVisibility(document.draft) }));
  for (const document of editorDocuments) validateContent(document.key, document.draft);
  return <ContentEditor documents={editorDocuments} media={(media ?? []).filter(file => /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file.name)).map(file => `/api/content-media/${file.name}`)} />;
}
