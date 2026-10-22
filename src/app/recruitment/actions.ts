"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { imageExtension } from "@/src/lib/platform/image-upload";
import { recruitmentDocumentExtension } from "@/src/lib/platform/recruitment";
import { isAllowedMeetingUrl, isValidTimeZone, localLessonToUtc } from "@/src/lib/platform/scheduling";
import type { ActionResult, Database, RecruitmentQuestion } from "@/src/lib/platform/types";

class InputError extends Error {}

function text(form: FormData, key: string, max = 2000, required = true) {
  const value = form.get(key);
  if (typeof value !== "string" || (required && !value.trim()) || value.trim().length > max)
    throw new InputError(`Please check ${key.replaceAll("_", " ")} (maximum ${max} characters).`);
  return value.trim();
}

function id(form: FormData, key: string) {
  const value = text(form, key, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new InputError("Invalid record. Refresh and try again.");
  return value;
}

function result(error: PostgrestError | null, message: string): ActionResult {
  if (!error) return { ok: true, message };
  console.error("Recruitment operation failed:", error.code);
  return { ok: false, message: ["P0001", "42501"].includes(error.code) ? error.message
    : error.code === "23505" || error.code === "23P01" ? "This application or time slot has just changed. Refresh and try again."
    : error.code === "23514" || error.code === "22007" ? "Check the fields and programme rules before trying again."
    : "Recruitment could not be updated. Check the database migration or contact ABVN." };
}

async function perform(admin: boolean, operation: (member: NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>) => Promise<ActionResult>) {
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Please sign in to continue." };
  if (admin && (member.profile.role !== "admin" || member.profile.status !== "approved"))
    return { ok: false, message: "An approved admin account is required." };
  try {
    const response = await operation(member);
    if (response.ok) {
      revalidatePath("/apply");
      revalidatePath("/student-apply");
      revalidatePath("/dashboard", "layout");
      revalidatePath("/teachers", "layout");
      revalidatePath("/members/[code]", "page");
    }
    return response;
  } catch (error) {
    if (error instanceof InputError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function submitApplication(_: ActionResult, form: FormData) {
  return perform(false, async ({ supabase, user, profile }) => {
    if (profile.role) throw new InputError("Your account already has an ABVN role.");
    if (profile.status === "suspended") throw new InputError("Your account is suspended. Contact ABVN.");
    const role = text(form, "role", 10);
    if (role !== "teacher" && role !== "student") throw new InputError("Choose teacher or student.");
    const timeZone = text(form, "time_zone", 100);
    if (!isValidTimeZone(timeZone)) throw new InputError("Enter a valid IANA time zone, such as Asia/Ho_Chi_Minh.");
    const hours = Number(text(form, "weekly_hours", 2));
    if (!Number.isInteger(hours) || hours < 1 || hours > 40) throw new InputError("Choose between 1 and 40 hours per week.");
    const answers: Record<string, string> = {};
    for (const [key, value] of form.entries())
      if (key.startsWith("answer_") && typeof value === "string") answers[key.slice(7)] = value.trim();
    const input: Database["public"]["Functions"]["submit_recruitment_application"]["Args"] = {
      p_role: role, p_full_name: text(form, "full_name", 100), p_country: text(form, "country", 100),
      p_time_zone: timeZone, p_phone: text(form, "phone", 30), p_intro: text(form, "intro", 4000),
      p_date_of_birth: text(form, "date_of_birth", 10, false) || null,
      p_weekly_hours: hours, p_intro_video_url: text(form, "intro_video_url", 2000, false) || null,
      p_cv_path: null, p_photo_path: null, p_answers: answers,
    };
    const files: { bucket: string; path: string; bytes: Uint8Array; mime: string }[] = [];
    for (const key of ["cv", "photo"]) {
      const file = form.get(key);
      if (!(file instanceof File) || !file.size) {
        if (role === "teacher") throw new InputError(key === "cv" ? "Upload your CV." : "Upload your profile photo.");
        continue;
      }
      if (file.size > (key === "cv" ? 5 : 2) * 1024 * 1024)
        throw new InputError(key === "cv" ? "Your document must be 5 MB or smaller." : "Your photo must be 2 MB or smaller.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = key === "photo" ? imageExtension(bytes, file.type) : recruitmentDocumentExtension(bytes, file.type);
      if (!extension) throw new InputError(key === "cv" ? "Upload a PDF, DOC, or DOCX document." : "Upload a JPEG, PNG, or WebP photo.");
      files.push({ bucket: key === "cv" ? "recruitment-documents" : "avatars", path: `${user.id}/${crypto.randomUUID()}.${extension}`, bytes, mime: file.type });
    }
    const uploaded: typeof files = [];
    async function cleanup() {
      for (const file of uploaded) {
        const { error } = await supabase.storage.from(file.bucket).remove([file.path]);
        if (error) console.error("Unused recruitment upload cleanup failed:", error.name);
      }
    }
    for (const file of files) {
      const { error } = await supabase.storage.from(file.bucket).upload(file.path, file.bytes, { contentType: file.mime });
      if (error) {
        console.error("Recruitment upload failed:", error.name);
        await cleanup();
        return { ok: false, message: "Your files could not be uploaded. No application was submitted. Check file limits or contact ABVN." };
      }
      uploaded.push(file);
      if (file.bucket === "avatars") input.p_photo_path = file.path;
      else input.p_cv_path = file.path;
    }
    const { error } = await supabase.rpc("submit_recruitment_application", input);
    if (error) await cleanup();
    return result(error, "Application submitted. You can follow your progress here.");
  });
}

export async function saveQuestion(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const role = text(form, "role", 10);
    if (role !== "teacher" && role !== "student") throw new InputError("Choose a form.");
    const fieldType = text(form, "field_type", 20);
    const types: RecruitmentQuestion["field_type"][] = ["short_text", "long_text", "number", "select", "boolean", "url"];
    const type = types.find(type => type === fieldType);
    if (!type) throw new InputError("Choose a supported question type.");
    const position = Number(text(form, "position", 4));
    if (!Number.isInteger(position) || position < 0 || position > 1000) throw new InputError("Order must be between 0 and 1000.");
    const { error } = await supabase.rpc("admin_save_recruitment_question", {
      p_id: form.get("id") ? id(form, "id") : null, p_role: role,
      p_label: text(form, "label", 300), p_help: text(form, "help_text", 500, false),
      p_field_type: type, p_options: type === "select" ? text(form, "options", 4020).split("\n").map(value => value.trim()).filter(Boolean) : [],
      p_required: form.get("required") === "on", p_position: position, p_active: form.get("active") === "on",
    });
    return result(error, "Question saved. Existing submitted answers are unchanged.");
  });
}

export async function reviewApplication(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_review_application", {
      p_application_id: id(form, "application_id"), p_decision: text(form, "decision", 10),
      p_note: text(form, "note", 4000, false),
    });
    return result(error, "Application review saved.");
  });
}

export async function recordInterviewResult(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_record_interview_result", {
      p_application_id: id(form, "application_id"), p_decision: text(form, "decision", 10),
      p_feedback: text(form, "feedback", 4000),
    });
    return result(error, "Final decision saved. Accepted applicants now have their programme account.");
  });
}

export async function reopenApplication(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_reopen_application", { p_application_id: id(form, "application_id") });
    return result(error, "The applicant may now submit a new application.");
  });
}

export async function createInterviewSlot(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const zone = text(form, "time_zone", 100);
    const local = text(form, "starts_at", 16);
    const duration = Number(text(form, "duration", 2));
    const meeting = text(form, "meeting_url", 2000);
    if (!isAllowedMeetingUrl(meeting)) throw new InputError("Use a Google Meet, Zoom, Teams, or Skype meeting link.");
    let time: ReturnType<typeof localLessonToUtc>;
    try { time = localLessonToUtc(local, zone, duration); }
    catch (error) { if (error instanceof Error) throw new InputError(error.message); throw error; }
    const { error } = await supabase.rpc("admin_create_interview_slot", { p_starts_at: time.startsAt, p_ends_at: time.endsAt, p_meeting_url: meeting });
    return result(error, "Interview slot created. Invited applicants can book it.");
  });
}

export async function cancelInterviewSlot(_: ActionResult, form: FormData) {
  return perform(true, async ({ supabase }) => {
    const { error } = await supabase.rpc("admin_cancel_interview_slot", { p_slot_id: id(form, "slot_id") });
    return result(error, "Slot cancelled. Any affected applicant can choose a new time.");
  });
}

export async function bookInterview(_: ActionResult, form: FormData) {
  return perform(false, async ({ supabase }) => {
    const { error } = await supabase.rpc("book_interview_slot", { p_slot_id: id(form, "slot_id") });
    return result(error, "Your interview is booked.");
  });
}

export async function cancelInterview() {
  return perform(false, async ({ supabase }) => {
    const { error } = await supabase.rpc("cancel_interview_booking");
    return result(error, "Booking cancelled. Choose another available interview time.");
  });
}
