import { createSupabaseServerClient } from "@/src/lib/platform/server";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return new Response("Invalid media name.", { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("web-content").createSignedUrl(name, 60);
  if (error || !data) {
    console.error("Website media unavailable:", error?.name ?? "missing URL");
    return new Response("Image unavailable or not published.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return new Response(null, { status: 307, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" } });
}
