"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { hasAdminAccess } from "@/src/lib/platform/permissions";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { imageExtension } from "@/src/lib/platform/image-upload";
import { ContentValidationError, upgradeNewsVisibility, validateContent, type ContentBody, type ContentKey } from "@/src/lib/content/schema";
import { mergeContentDraft, sameContent } from "@/src/lib/content/merge";

async function admin() {
  const member = await getCurrentMember();
  if (!member || member.profile.status !== "approved" || !hasAdminAccess(member.profile)) return null;
  return member;
}

export async function writeContent(key: ContentKey, input: unknown, version: number, publish: boolean, base?: ContentBody) {
  const member = await admin();
  if (!member) return { ok: false, message: "An approved admin account is required." };
  if (!["home", "about", "news"].includes(key) || !Number.isSafeInteger(version) || typeof publish !== "boolean") return { ok: false, message: "Invalid content request. Refresh and retry." };
  try { validateContent(key, input); if (base) validateContent(key, base); }
  catch (error) {
    if (!(error instanceof ContentValidationError)) throw error;
    return { ok: false, message: error.message };
  }
  const write = (body: ContentBody, expectedVersion: number) => key === "news"
    ? member.supabase.rpc("admin_write_news", { p_body: body, p_version: expectedVersion, p_publish: publish })
    : member.supabase.rpc("admin_write_content", { p_key: key, p_body: body, p_version: expectedVersion, p_publish: publish });
  let { data, error } = await write(input, version);
  let savedInput = input;
  let mergedChanges = false;
  if (error?.code === "P0001" && error.message.startsWith("Another admin changed")) {
    const { data: latest, error: loadError } = await member.supabase.from("content_documents").select("*").eq("key", key).single();
    if (loadError) {
      console.error("Latest website draft load failed:", loadError.code);
      return { ok: false, message: "The saved version changed, and the latest draft could not be loaded. Your edits are still here. Retry shortly." };
    }
    const remote = upgradeNewsVisibility(latest.draft);
    if (base) {
      const merged = mergeContentDraft(base, input, remote);
      if (merged) {
        try { validateContent(key, merged); }
        catch (failure) {
          if (!(failure instanceof ContentValidationError)) throw failure;
          return { ok: false, message: `Your changes were kept, but merging with the latest draft needs review: ${failure.message}`, conflict: { key, body: remote, version: latest.version } };
        }
        savedInput = merged;
        ({ data, error } = await write(merged, latest.version));
        mergedChanges = !sameContent(base, remote);
      }
    }
    if (error?.message.startsWith("Another admin changed")) return {
      ok: false, message: "The saved draft changed since this editor was opened. Your edits have been kept; review the latest draft before replacing anything.",
      conflict: { key, body: remote, version: latest.version },
    };
  }
  if (error) {
    console.error("Website content save failed:", error.code);
    return { ok: false, message: error.message.includes("unsupported formatting") ? "The database rejected the article format. Apply migrations 010, 011 and 012 (editor fix, media and article styles) after migration 009, then retry. Your edits are still here." : ["P0001","42501"].includes(error.code) ? error.message : key === "news" ? "News was not saved. Check the news editor migrations in the setup guide, then retry." : "Content was not saved. Check the web content migration and try again." };
  }
  revalidatePath("/dashboard/admin");
  if (publish) {
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/news", "layout");
  }
  if (data === null) throw new Error("The content save did not return a saved version.");
  return { ok: true, message: (publish ? "Published. Your changes are now live." : "Draft saved. The public website has not changed.") + (mergedChanges ? " Non-conflicting changes from the latest draft were preserved." : ""), version: typeof data === "number" ? data : data.version, body: typeof data === "number" ? savedInput : data.body };
}

export async function uploadContentMedia(form: FormData) {
  if (!await admin()) return { ok: false, message: "An approved admin account is required." };
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > 2097152) return { ok: false, message: "Choose a JPEG, PNG or WebP image up to 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = imageExtension(bytes, file.type);
  if (!ext) return { ok: false, message: "The file must contain a valid JPEG, PNG or WebP image." };
  const name = `${crypto.randomUUID()}.${ext}`;
  const supabase = await createSupabaseServerClient(true);
  const { error } = await supabase.storage.from("web-content").upload(name, bytes, { contentType: file.type });
  if (error) {
    console.error("Website media upload failed:", error.name);
    return { ok: false, message: "The image was not uploaded. Apply the web content migration and try again." };
  }

  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Image uploaded privately. It becomes public only when used in published content.", path: `/api/content-media/${name}` };
}

export async function deleteContentMedia(path: string) {
  const member = await admin();
  if (!member) return { ok: false, message: "An approved admin account is required." };
  if (!/^\/api\/content-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return { ok: false, message: "Only uploaded website images can be removed." };
  const [{ data: documents, error }, { data: revisions, error: historyError }] = await Promise.all([
    member.supabase.from("content_documents").select("*"),
    member.supabase.from("content_revisions").select("*"),
  ]);
  if (error || historyError) {
    console.error("Media usage check failed:", error?.code ?? historyError?.code);
    return { ok: false, message: "Image usage could not be checked. Nothing was removed." };
  }
  if ([...(documents ?? []), ...(revisions ?? [])].some(item => JSON.stringify(item).includes(path))) return { ok: false, message: "This image is used in a saved draft, published page, or revision. Keep it so content and rollback continue working." };
  const supabase = await createSupabaseServerClient(true);
  const { data, error: deleteError } = await supabase.storage.from("web-content").remove([path.slice("/api/content-media/".length)]);
  if (deleteError || !data?.length) {
    console.error("Website media removal failed:", deleteError?.name ?? "no image removed");
    return { ok: false, message: "The image was not removed. It may be referenced by another admin's changes. Refresh and retry." };
  }
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Unused image removed." };
}
