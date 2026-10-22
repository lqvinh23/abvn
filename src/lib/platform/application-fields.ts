import type { RecruitmentRole } from "./types";

export const applicationFieldDefinitions = [
  { key: "full_name", label: "Full name", type: "short_text", required: true },
  { key: "email", label: "Account email", type: "email", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: true },
  { key: "country", label: "Country", type: "short_text", required: true },
  { key: "time_zone", label: "Time zone", type: "short_text", required: true },
  { key: "date_of_birth", label: "Date of birth", type: "date", required: false },
  { key: "weekly_hours", label: "Hours per week", type: "number", required: true },
  { key: "intro", label: "Personal introduction", type: "long_text", required: true },
  { key: "photo", label: "Profile picture", type: "image", required: false },
  { key: "cv", label: "CV / supporting document", type: "document", required: false },
  { key: "intro_video_url", label: "Introduction video", type: "url", required: false },
] as const;

export type ApplicationFieldKey = typeof applicationFieldDefinitions[number]["key"];
export type ApplicationField = {
  role: RecruitmentRole; field_key: ApplicationFieldKey; label: string; help_text: string;
  required: boolean; active: boolean; deleted: boolean; position: number;
};

export function defaultApplicationFields(role: RecruitmentRole): ApplicationField[] {
  return applicationFieldDefinitions.map((field, index) => ({
    role, field_key: field.key, label: field.label, help_text: "", active: true, deleted: false, position: index,
    required: field.required || (field.key === "date_of_birth" && role === "student") || (["photo", "cv"].includes(field.key) && role === "teacher"),
  }));
}

export function protectedApplicationField(field: Pick<ApplicationField, "role" | "field_key">) {
  return defaultApplicationFields(field.role).find(item => item.field_key === field.field_key)!.required;
}
