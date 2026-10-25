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
import { isValidNationalIdLast8, recruitmentDocumentExtension } from "@/src/lib/platform/recruitment";
import { hasAdminAccess } from "@/src/lib/platform/permissions";
import { settingsFromForm, type SettingValues } from "@/src/lib/platform/settings";

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
  const authorized = role === "admin"
    ? hasAdminAccess(member.profile)
    : role === "approved" || role === "member"
      ? true
      : member.profile.role === role;
  if (role !== "member" && (member.profile.status !== "approved" || !authorized)) {
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

export async function saveProfile(_: ActionResult, form: FormData) {
  return perform("approved", async ({ profile, user }) => {
    const workspace = text(form, "workspace_role", 10, false);
    if (workspace && workspace !== "admin" && workspace !== profile.role)
      throw new InputError("This workspace is unavailable to your account.");
    const adminWorkspace = workspace === "admin" || (!workspace && profile.role === "admin");
    if (adminWorkspace && !hasAdminAccess(profile))
      throw new InputError("An approved admin account is required.");
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone))
      throw new InputError(
        "Enter a valid IANA time zone, such as Asia/Ho_Chi_Minh.",
      );
    const input = {
      p_name: text(form, "name", 100),
      p_country: text(form, "country", 100, false),
      p_bio: adminWorkspace ? profile.bio : text(form, "bio", 4000, false),
      p_time_zone: timeZone,
      p_focus: adminWorkspace ? profile.teaching_focus : text(form, "teaching_focus", 500, false),
      p_hobbies: adminWorkspace ? profile.hobbies : text(form, "hobbies", 500, false),
      p_proficiency: profile.role === "student" ? text(form, "proficiency", 2, false) : profile.proficiency,
      p_avatar_path: profile.avatar_path,
    };
    if (!["", "A1", "A2", "B1", "B2", "C1", "C2"].includes(input.p_proficiency))
      throw new InputError("Choose a valid English level.");
    const meetingUrl = adminWorkspace ? text(form, "meeting_url", 2000, false) : "";
    if (meetingUrl && !isAllowedMeetingUrl(meetingUrl))
      throw new InputError("Use a valid HTTPS Google Meet, Zoom, Microsoft Teams, or Skype meeting link.");
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
    const { error } = adminWorkspace ? await supabase.rpc("save_admin_profile", {
      p_name: input.p_name, p_country: input.p_country, p_time_zone: input.p_time_zone,
      p_avatar_path: input.p_avatar_path, p_meeting_url: meetingUrl,
    }) : await supabase.rpc("save_profile", input);
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
    if (error && ["42883", "PGRST202", "42P01"].includes(error.code))
      return { ok: false, message: "Admin profile settings need migration 202610220016_admin_profile_preferences.sql. Apply it once in Supabase SQL Editor, then retry. Your profile has not changed." };
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
        Number(text(form, "duration", 3)),
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

export async function editCalendarSlot(_: ActionResult, form: FormData) {
  return perform("approved", async ({ supabase, profile }) => {
    if (profile.role !== "teacher" && !hasAdminAccess(profile))
      throw new InputError("Only a teacher or admin can edit lesson slots.");
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone))
      throw new InputError("Enter a valid IANA time zone.");
    let dates: ReturnType<typeof localLessonToUtc>;
    try {
      dates = localLessonToUtc(
        text(form, "start", 16),
        timeZone,
        Number(text(form, "duration", 3)),
      );
    } catch (error) {
      if (error instanceof Error) throw new InputError(error.message);
      throw error;
    }
    const meetingUrl = text(form, "meeting_url", 1000);
    if (!isAllowedMeetingUrl(meetingUrl))
      throw new InputError(
        "Use a valid HTTPS Google Meet, Zoom, Microsoft Teams, or Skype meeting link.",
      );
    const { error } = await supabase.rpc("edit_calendar_slot", {
      p_slot_id: uuid(form, "slot_id"),
      p_starts_at: dates.startsAt,
      p_ends_at: dates.endsAt,
      p_meeting_url: meetingUrl,
      p_title: text(form, "title", 120),
      p_description: text(form, "description", 2000, false),
    });
    if (error && ["42883", "PGRST202", "42P01"].includes(error.code))
      return { ok: false, message: "Slot editing and participant notifications need migration 202610230019_slot_edit_notifications.sql. Apply it once, then retry." };
    return databaseResult(error, "Lesson updated. The booked student was notified if its schedule changed.");
  });
}

export async function markScheduleChangeRead(_: ActionResult, form: FormData) {
  return perform("member", async ({ supabase }) => {
    const { error } = await supabase.rpc("member_read_schedule_change", {
      p_notification_id: uuid(form, "notification_id"),
    });
    return databaseResult(error, "Notification marked as read.");
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

export async function assignMemberRole(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    const role = text(form, "role", 10);
    if (role !== "teacher" && role !== "student" && role !== "admin")
      throw new InputError("Choose Teacher, Student, or Admin.");
    const { error } = await supabase.rpc("admin_assign_member_role", {
      p_user_id: uuid(form, "user_id"),
      p_role: role,
    });
    if (error && ["PGRST202", "42883"].includes(error.code)) {
      console.error("Account assignment migration is missing:", error.code);
      return { ok: false, message: "Account assignment needs migration 202610230022_combined_admin_roles.sql. Apply it once in Supabase SQL Editor, then retry." };
    }
    return databaseResult(error, role === "admin" ? "Admin workspace access granted." : `${role[0].toUpperCase() + role.slice(1)} role activated and account approved.`);
  });
}

export async function removeMemberRole(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    const role = text(form, "role", 10);
    if (role !== "teacher" && role !== "student" && role !== "admin")
      throw new InputError("Choose Teacher, Student, or Admin.");
    const { error } = await supabase.rpc("admin_remove_member_role", {
      p_user_id: uuid(form, "user_id"),
      p_role: role,
    });
    if (error && ["PGRST202", "42883"].includes(error.code)) {
      console.error("Role removal migration is missing:", error.code);
      return { ok: false, message: "Role removal needs migration 202610230023_role_management.sql. Apply it once in Supabase SQL Editor, then retry." };
    }
    return databaseResult(error, role === "admin" ? "Admin workspace access removed." : `${role[0].toUpperCase() + role.slice(1)} status set to inactive. History has been preserved.`);
  });
}

export async function removeMemberAccount(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_remove_member_account", {
      p_user_id: uuid(form, "user_id"),
    });
    if (error && ["PGRST202", "42883"].includes(error.code)) {
      console.error("Account removal migration is missing:", error.code);
      return { ok: false, message: "Account removal needs migration 202610230021_account_management.sql. Apply it once in Supabase SQL Editor, then retry." };
    }
    return databaseResult(error, "The account and profile were permanently deleted.");
  });
}

export async function saveStudentProfile(_: ActionResult, form: FormData) {
  return perform("admin", async () => {
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone)) throw new InputError("Choose a valid time zone.");
    const status = (["active", "inactive", "suspended", "banned"] as const).find(value => value === text(form, "participation_status", 12));
    if (!status) throw new InputError("Choose a valid study status.");
    const proficiency = text(form, "proficiency", 2, false);
    if (!["", "A1", "A2", "B1", "B2", "C1", "C2"].includes(proficiency)) throw new InputError("Choose a valid English level.");
    const expires = text(form, "study_expires_on", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) throw new InputError("Enter a valid study expiry date.");
    const birth = text(form, "date_of_birth", 10, false);
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw new InputError("Enter a valid date of birth.");
    const nationalId = text(form, "national_id_last8", 8, false);
    if (nationalId && !isValidNationalIdLast8(nationalId)) throw new InputError("Enter exactly the last 8 digits of the National / Citizen ID number.");
    const userId = uuid(form, "user_id");
    const supabase = await createSupabaseServerClient(true);

    const uploads: { bucket: "avatars" | "recruitment-documents"; path: string; bytes: Uint8Array; mime: string; field: "avatar" | "cv" }[] = [];
    for (const field of ["avatar", "cv"] as const) {
      const file = form.get(field);
      if (!(file instanceof File) || !file.size) continue;
      if (file.size > (field === "cv" ? 5 : 2) * 1024 * 1024) throw new InputError(field === "cv" ? "The CV must be 5 MB or smaller." : "The profile image must be 2 MB or smaller.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = field === "avatar" ? imageExtension(bytes, file.type) : recruitmentDocumentExtension(bytes, file.type);
      if (!extension) throw new InputError(field === "cv" ? "Upload a PDF, DOC or DOCX CV." : "Upload a JPEG, PNG or WebP profile image.");
      uploads.push({ field, bucket: field === "cv" ? "recruitment-documents" : "avatars", path: `${userId}/${crypto.randomUUID()}.${extension}`, bytes, mime: file.type });
    }
    const uploaded: typeof uploads = [];
    async function remove(files: { bucket: string; path: string }[]) {
      for (const file of files) {
        const { error } = await supabase.storage.from(file.bucket).remove([file.path]);
        if (error) console.error("Student file cleanup failed:", error.name);
      }
    }
    for (const file of uploads) {
      const { error } = await supabase.storage.from(file.bucket).upload(file.path, file.bytes, { contentType: file.mime });
      if (error) {
        console.error("Student file upload failed:", error.name);
        await remove(uploaded);
        return { ok: false, message: "The files could not be uploaded. Nothing was saved." };
      }
      uploaded.push(file);
    }
    const { error } = await supabase.rpc("admin_save_student", {
      p_user_id: userId, p_name: text(form, "name", 100), p_city: text(form, "city", 100, false),
      p_address: text(form, "address", 300, false), p_country: text(form, "country", 100, false), p_time_zone: timeZone,
      p_bio: text(form, "bio", 4000, false), p_hobbies: text(form, "hobbies", 500, false), p_goals: text(form, "goals", 500, false),
      p_occupation: text(form, "occupation", 100, false), p_organization: text(form, "organization", 150, false),
      p_facebook_url: text(form, "facebook_url", 300, false), p_proficiency: proficiency, p_participation_status: status,
      p_study_expires_on: expires, p_phone: text(form, "phone", 30, false), p_date_of_birth: birth || null,
      p_intro_video_url: text(form, "intro_video_url", 500, false), p_reason: text(form, "reason", 1000, false),
      p_avatar_path: uploaded.find(file => file.field === "avatar")?.path ?? null,
      p_cv_path: uploaded.find(file => file.field === "cv")?.path ?? null,
      p_national_id_last8: nationalId,
    });
    if (error) {
      await remove(uploaded);
      if (["PGRST202", "42883"].includes(error.code)) {
        console.error("Student profile migration is missing:", error.code);
        return { ok: false, message: "Saving students needs migration 202610250034_student_national_identity.sql after the earlier migrations. Apply it once in Supabase SQL Editor, then retry." };
      }
      return databaseResult(error, "");
    }
    // The replaced files are no longer referenced; removal failures only leave unused private files.
    const previous = (["avatar", "cv"] as const).flatMap(field => {
      const path = form.get(`current_${field}`);
      const replaced = uploaded.find(file => file.field === field);
      return replaced && typeof path === "string" && path.startsWith(`${userId}/`) ? [{ bucket: replaced.bucket, path }] : [];
    });
    await remove(previous);
    return { ok: true, message: "Student profile saved." };
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

function missingSettings(error: PostgrestError | null) {
  if (error && ["PGRST202", "42883", "42P01"].includes(error.code)) {
    console.error("Platform settings migration is missing:", error.code);
    return { ok: false, message: "Settings need migration 202610240028_platform_settings.sql. Apply it once in Supabase SQL Editor, then retry." } satisfies ActionResult;
  }
  return null;
}

export async function savePlatformSettings(_: ActionResult, form: FormData) {
  return perform("admin", async ({ supabase }) => {
    let values: SettingValues;
    try { values = settingsFromForm(form); } catch (error) { throw new InputError(error instanceof Error ? error.message : "Check the settings and try again."); }
    if (!isValidTimeZone(String(values.rule_time_zone))) throw new InputError("Choose a valid rule time zone.");
    const { data, error } = await supabase.rpc("admin_save_platform_settings", { p_values: values, p_note: text(form, "note", 500, false) });
    const missing = missingSettings(error);
    if (missing) return missing;
    return databaseResult(error, data === 0 ? "No settings changed." : `${data} setting${data === 1 ? "" : "s"} saved. New rules apply immediately.`);
  });
}

export async function resetPlatformSettings() {
  return perform("admin", async ({ supabase }) => {
    const { data, error } = await supabase.rpc("admin_reset_platform_settings");
    const missing = missingSettings(error);
    if (missing) return missing;
    return databaseResult(error, data === 0 ? "All settings already use the defaults." : "Settings reset to the defaults.");
  });
}

export async function runPolicyReview() {
  return perform("admin", async ({ supabase }) => {
    const { data, error } = await supabase.rpc("admin_run_policy_review");
    const missing = missingSettings(error);
    if (missing) return missing;
    if (error || !data) return databaseResult(error, "");
    return { ok: true, message: `Review complete: ${data.inactivated} student${data.inactivated === 1 ? "" : "s"} inactivated, ${data.restored} restored.` };
  });
}
