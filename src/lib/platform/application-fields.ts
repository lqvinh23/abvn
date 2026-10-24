import type { RecruitmentRole } from "./types";

export const applicationFieldDefinitions = [
  { key: "full_name", label: "Full name", type: "short_text", required: true },
  { key: "email", label: "Account email", type: "email", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: true },
  { key: "country", label: "Country", type: "short_text", required: true },
  { key: "time_zone", label: "Time zone", type: "short_text", required: true },
  { key: "date_of_birth", label: "Date of birth", type: "date", required: false },
  { key: "weekly_hours", label: "Hours per week", type: "number", required: true, roles: ["teacher"] },
  { key: "intro", label: "Personal introduction", type: "long_text", required: true },
  { key: "photo", label: "Profile picture", type: "image", required: false },
  { key: "cv", label: "CV / supporting document", type: "document", required: false },
  { key: "intro_video_url", label: "Introduction video", type: "url", required: false },
  { key: "city", label: "City / Province", type: "short_text", required: false, roles: ["student"] },
  { key: "address", label: "Detailed address", type: "short_text", required: false, roles: ["student"] },
  { key: "occupation", label: "Occupation", type: "short_text", required: false, roles: ["student"] },
  { key: "organization", label: "Organization", type: "short_text", required: false, roles: ["student"] },
  { key: "proficiency", label: "English level", type: "select", required: false, roles: ["student"] },
  { key: "goals", label: "Learning goals", type: "long_text", required: false, roles: ["student"] },
  { key: "hobbies", label: "Hobbies and interests", type: "long_text", required: false, roles: ["student"] },
] as const;

const studentRequired = ["date_of_birth", "city", "address", "occupation", "organization", "proficiency", "goals", "hobbies"];
const teacherRequired = ["weekly_hours", "photo", "cv"];
const studentPositions = ["full_name", "email", "phone", "date_of_birth", "country", "city", "address", "time_zone", "occupation", "organization", "proficiency", "goals", "hobbies", "intro", "photo", "cv", "intro_video_url"];

export type ApplicationFieldKey = typeof applicationFieldDefinitions[number]["key"];
export type ApplicationField = {
  role: RecruitmentRole; field_key: ApplicationFieldKey; label: string; help_text: string;
  required: boolean; active: boolean; deleted: boolean; position: number;
};

export function defaultApplicationFields(role: RecruitmentRole): ApplicationField[] {
  const applicable = applicationFieldDefinitions.filter(field => !("roles" in field) || (field.roles as readonly string[]).includes(role));
  const fields = applicable.map((field, index) => ({
    role, field_key: field.key, label: role === "student" && field.key === "intro" ? "Biography" : field.label, help_text: "", active: true, deleted: false,
    position: role === "student" ? studentPositions.indexOf(field.key) : index,
    required: ["full_name", "email", "phone", "country", "time_zone", "intro"].includes(field.key)
      || (role === "student" && studentRequired.includes(field.key)) || (role === "teacher" && teacherRequired.includes(field.key)),
  }));
  return fields.toSorted((a, b) => a.position - b.position);
}

export function protectedApplicationField(field: Pick<ApplicationField, "role" | "field_key">) {
  return defaultApplicationFields(field.role).find(item => item.field_key === field.field_key)?.required ?? false;
}
