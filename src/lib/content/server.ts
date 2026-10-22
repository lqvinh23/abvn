import "server-only";
import { cache } from "react";
import { getSupabaseConfig } from "../platform/config";
import { createSupabaseServerClient } from "../platform/server";
import { defaultContent, validateContent, type ContentKey, type NewsContent, type PageContent } from "./schema";

const loadContent = cache(async (key: ContentKey) => {
  if (!getSupabaseConfig()) return defaultContent(key);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("public_content", { p_key: key });
  if (error || !data) {
    console.error("Published website content could not be loaded:", error?.code ?? "missing document");
    throw new Error("Website content could not be loaded. Apply the web content database migration (202610210008_web_content.sql), then refresh.");
  }
  validateContent(key, data);
  return data;
});

export async function getPageContent(key: "home" | "about"): Promise<PageContent> {
  const content = await loadContent(key);
  if (!("fields" in content)) throw new Error("Invalid published page content.");
  return content;
}

export async function getNewsContent(): Promise<NewsContent> {
  const content = await loadContent("news");
  if (!("articles" in content)) throw new Error("Invalid published news content.");
  return content;
}
