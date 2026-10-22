"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import {
  isAllowedMeetingUrl,
  isValidTimeZone,
  localLessonToUtc,
} from "@/src/lib/platform/scheduling";
import type { ActionResult, ParticipationStatus, Role } from "@/src/lib/platform/types";
import type { PostgrestError } from "@supabase/supabase-js";
import { imageExtension } from "@/src/lib/platform/image-upload";

class InputError extends Error {}

function text(form: FormData, key: string, max = 2000, required = true) {
  const value = form.get(key);
  if (
    typeof value !== "string" ||
    (required && !value.trim()) ||
    value.trim().length > max
  ) {
    throw new InputError(
      `Please check the ${key.replaceAll("_", " ")} field (maximum ${max} characters).`,
    );
  }
  return value.trim();
}

function uuid(form: FormData, key: string) {
  const value = text(form, key, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new InputError(
      "This record is invalid. Refresh the dashboard and try again.",
    );
  }
  return value;
}

function databaseResult(
  error: PostgrestError | null,
  message: string,
): ActionResult {
  if (!error) return { ok: true, message };
  console.error("Platform operation failed:", error.code);
  return {
    ok: false,
    message: ["P0001", "42501"].includes(error.code)
      ? error.message
      : error.code === "23514"
        ? "One or more values do not meet the programme rules. Check your inputs."
        : "The change could not be saved. Refresh and retry, or contact ABVN.",
  };
}

async function perform(
  role: Role | "approved" | "member",
  operation: (
    member: NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>,
  ) => Promise<ActionResult>,
) {
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Please sign in again." };
  if (
    role !== "member" &&
    (member.profile.status !== "approved" ||
      (role !== "approved" && member.profile.role !== role))
  ) {
    return {
      ok: false,
      message: "Your account is not authorized for this action.",
    };
  }
  try {
    const result = await operation(member);
    if (result.ok) {
      revalidatePath("/dashboard", "layout");
      revalidatePath("/members/[code]", "page");
      revalidatePath("/teachers", "page");
      revalidatePath("/teachers/page/[page]", "page");
    }
    return result;
  } catch (error) {
    if (error instanceof InputError)
      return { ok: false, message: error.message };
    throw error;
  }
}

export async function requestMembership(_: ActionResult, form: FormData) {
  return perform("member", async ({ supabase }) => {
    const role = text(form, "role", 20);
    if (role !== "teacher" && role !== "student")
      throw new InputError("Choose teacher or student.");
    const { error } = await supabase.rpc("request_membership", {
      p_role: role,
    });
    return databaseResult(
      error,
      "Your request has been sent to ABVN. We will review your membership.",
    );
  });
}

export async function saveProfile(_: ActionResult, form: FormData) {
  return perform("approved", async ({ profile, user }) => {
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone))
      throw new InputError(
        "Enter a valid IANA time zone, such as Asia/Ho_Chi_Minh.",
      );
    const input = {
      p_name: text(form, "name", 100),
      p_country: text(form, "country", 100, false),
      p_bio: text(form, "bio", 4000, false),
      p_time_zone: timeZone,
      p_focus: text(form, "teaching_focus", 500, false),
      p_hobbies: text(form, "hobbies", 500, false),
      p_proficiency: text(form, "proficiency", 2, false),
      p_avatar_path: profile.avatar_path,
    };
    if (!["", "A1", "A2", "B1", "B2", "C1", "C2"].includes(input.p_proficiency))
      throw new InputError("Choose a valid English level.");
    const file = form.get("avatar");
    const supabase = await createSupabaseServerClient(true);
    let uploadedPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024)
        throw new InputError("Choose an image smaller than 2 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = file.type;
      const extension = imageExtension(bytes, mime);
      if (!extension)
        throw new InputError("Upload a JPEG, PNG, or WebP image.");
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(uploadedPath, bytes, { contentType: mime });
      if (error) {
        console.error("Avatar upload failed:", error.name);
        return {
          ok: false,
          message:
            "Your image could not be uploaded. Your profile was not changed.",
        };
      }
      input.p_avatar_path = uploadedPath;
    }
    const { error } = await supabase.rpc("save_profile", input);
    if (error && uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("avatars")
        .remove([uploadedPath]);
      if (cleanupError)
        console.error("Unused avatar cleanup failed:", cleanupError.name);
    }
    if (!error && uploadedPath && profile.avatar_path) {
      const { error: cleanupError } = await supabase.storage
        .from("avatars")
        .remove([profile.avatar_path]);
      if (cleanupError)
        console.error("Previous avatar cleanup failed:", cleanupError.name);
    }
    return databaseResult(error, "Your profile has been updated.");
  });
}

export async function createSlot(_: ActionResult, form: FormData) {
  return perform("teacher", async ({ supabase }) => {
    let dates: ReturnType<typeof localLessonToUtc>;
    try {
      dates = localLessonToUtc(
        text(form, "start", 16),
        text(form, "time_zone", 100),
        Number(text(form, "duration", 2)),
      );
    } catch (error) {
      if (error instanceof Error) throw new InputError(error.message);
      throw error;
    }
    const url = text(form, "meeting_url", 1000);
    if (!isAllowedMeetingUrl(url))
      throw new InputError(
        "Use a valid HTTPS Google Meet, Zoom, Microsoft Teams, or Skype meeting link.",
      );
    const { error } = await supabase.rpc("create_calendar_slot", {
      p_start: dates.startsAt,
      p_end: dates.endsAt,
      p_meeting_url: url,
      p_title: text(form, "title", 120),
      p_description: text(form, "description", 2000, false),
    });
    return databaseResult(
      error,
      "Your lesson time is published and available for booking.",
    );
  });
}

export async function bookLesson(_: ActionResult, form: FormData) {
  return perform("student", async ({ supabase }) => {
    const { error } = await supabase.rpc("book_lesson", {
      p_slot_id: uuid(form, "slot_id"),
    });
    return databaseResult(
      error,
      "Your lesson is booked. Select it in Schedule to open your classroom.",
    );
  });
}

export async function cancelLesson(_: ActionResult, form: FormData) {
  return perform("approved", async ({ supabase }) => {
    const { error } = await supabase.rpc("cancel_lesson", {
      p_slot_id: uuid(form, "slot_id"),
    });
    return databaseResult(error, "The lesson has been cancelled.");
  });
}

export async function submitFeedback(_: ActionResult, form: FormData) {
  return perform("approved", async ({ supabase, profile }) => {
    if (profile.role === "admin")
      throw new InputError("Only participants can leave lesson feedback.");
    const attendance =
      profile.role === "teacher" ? text(form, "attendance", 10) : null;
    if (
      attendance !== null &&
      attendance !== "present" &&
      attendance !== "absent" &&
      attendance !== "apologized" &&
      attendance !== "cancelled"
    )
      throw new InputError("Select Yes, No, No but Apologize, or Cancelled.");
    const { error } = await supabase.rpc("submit_written_feedback", {
      p_booking_id: uuid(form, "booking_id"),
      p_comment: text(form, "comment", 2000),
      p_attendance: attendance,
    });
    if (error?.code === "PGRST202" || error?.code === "42883") {
      console.error("Written feedback migration is missing:", error.code);
      return { ok: false, message: "Feedback needs a database update. Ask an admin to apply 202610210005_written_feedback.sql, then retry. Your feedback was not saved." };
    }
    return databaseResult(error, "Your feedback has been saved.");
  });
}

export async function reviewMember(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    const status = text(form, "status", 10);
    if (
      status !== "approved" &&
      status !== "rejected" &&
      status !== "suspended"
    )
      throw new InputError("Choose an account decision.");
    const { error } = await supabase.rpc("review_member", {
      p_user_id: uuid(form, "user_id"),
      p_status: status,
    });
    return databaseResult(error, `Account ${status}.`);
  });
}

export async function saveManagedProfile(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone)) throw new InputError("Enter a valid IANA time zone.");
    const participation = text(form, "participation_status", 12);
    const statuses: ParticipationStatus[] = ["active", "inactive", "guest", "banned", "suspended"];
    const selectedStatus = statuses.find(value => value === participation);
    if (!selectedStatus) throw new InputError("Choose a valid teaching or study status.");
    const proficiency = text(form, "proficiency", 2, false);
    if (!["", "A1", "A2", "B1", "B2", "C1", "C2"].includes(proficiency)) throw new InputError("Choose a valid English level.");
    const { error } = await supabase.rpc("admin_save_member", {
      p_user_id: uuid(form, "user_id"), p_name: text(form, "name", 100),
      p_country: text(form, "country", 100, false), p_bio: text(form, "bio", 4000, false),
      p_time_zone: timeZone, p_focus: text(form, "teaching_focus", 500, false),
      p_hobbies: text(form, "hobbies", 500, false), p_proficiency: proficiency,
      p_participation_status: selectedStatus,
    });
    return databaseResult(error, "Profile and participation status saved.");
  });
}
