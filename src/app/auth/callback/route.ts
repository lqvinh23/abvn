import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { getSiteUrl, getSupabaseConfig } from "@/src/lib/platform/config";

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) {
    return NextResponse.redirect(new URL("/login?error=setup", request.url));
  }
  const origin = getSiteUrl();
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient(true);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}/dashboard`);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    console.error("OAuth callback failed:", error.code);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
