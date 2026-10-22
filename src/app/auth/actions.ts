"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { getSiteUrl } from "@/src/lib/platform/config";

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient(true);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });
  if (error || !data.url) {
    console.error("Google sign-in could not start:", error?.code);
    redirect("/login?error=signin");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error("Sign-out failed:", error.code);
    throw new Error("Unable to sign out. Please try again.");
  }
  redirect("/login");
}
