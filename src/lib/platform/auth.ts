import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import type { Role } from "./types";

export async function getCurrentMember() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Unable to verify authentication:", authError.code);
    throw new Error(
      "Your session could not be verified. Please sign in again.",
    );
  }
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error("Unable to load member profile:", error.code);
    throw new Error(
      "Your profile could not be loaded. Check the database setup or contact ABVN.",
    );
  }
  return { supabase, user, profile, requestTime: Date.now() };
}

export async function requireMember(role?: Role) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.profile.status !== "approved" || !member.profile.role)
    redirect("/dashboard");
  if (role && member.profile.role !== role)
    redirect(`/dashboard/${member.profile.role}`);
  return member;
}
