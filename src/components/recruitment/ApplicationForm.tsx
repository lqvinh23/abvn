import type { Profile, RecruitmentQuestion, RecruitmentRole } from "@/src/lib/platform/types";
import type { ApplicationField } from "@/src/lib/platform/application-fields";
import ApplicationSubmission from "./ApplicationSubmission";
import { Field, Select, TextArea } from "../platform/Fields";
import TimeZoneSelect from "../platform/TimeZoneSelect";

export default function ApplicationForm({ role, profile, questions, fields }: { role: RecruitmentRole; profile: Profile; questions: RecruitmentQuestion[]; fields: ApplicationField[] }) {
  const defaults: Record<string, string> = { full_name: profile.full_name, country: profile.country, time_zone: profile.time_zone || "Asia/Ho_Chi_Minh" };
  return <ApplicationSubmission>
    <input type="hidden" name="role" value={role} />
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">About you</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {role === "student" ? <Select compact label="Gender *" name="gender" required defaultValue=""><option value="">Choose your gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select> : null}
        {fields.filter(field => field.active && !field.deleted).toSorted((a, b) => a.position - b.position).map(field => {
          const key = field.field_key;
          const label = `${field.label}${field.required ? " *" : " (optional)"}`;
          const wide = ["intro", "address", "goals", "hobbies"].includes(key);
          const hint = key === "photo" ? "JPEG, PNG or WebP, up to 2 MB." : key === "cv" ? "PDF, DOC or DOCX, up to 5 MB. Private to you and admins." : key === "intro_video_url" ? "A YouTube, Vimeo or Google Drive link accessible to ABVN reviewers." : key === "date_of_birth" && role === "student" ? "Students must be aged 16-25." : "";
          const helpText = [field.help_text, hint].filter(Boolean).join(" ");
          return <div key={key} className={wide ? "sm:col-span-2" : ""}>
            {key === "intro" || key === "goals" || key === "hobbies" ? <TextArea label={label} helpText={helpText} name={key} rows={key === "intro" ? 3 : 2} maxLength={key === "intro" ? 4000 : 500} required={field.required} /> :
              key === "email" ? <Field compact label={label} helpText={helpText} value={profile.email} readOnly type="email" /> :
              key === "time_zone" ? <TimeZoneSelect label={label} helpText={helpText} defaultValue={defaults.time_zone} required={field.required} /> :
              key === "national_id_last8" ? <Field compact label={label} helpText={helpText || "Enter only the last 8 digits, including any leading zeros. Do not enter your full ID number. Used privately by ABVN to prevent repeat enrolment."} name={key} type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" minLength={8} maxLength={8} required /> :
              key === "proficiency" ? <Select compact label={label} helpText={helpText} name={key} required={field.required} defaultValue=""><option value="">Choose your level</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map(level => <option key={level} value={level}>{level}</option>)}</Select> :
              key === "photo" || key === "cv" ? <Field compact label={label} helpText={helpText} name={key} type="file" accept={key === "photo" ? "image/jpeg,image/png,image/webp" : ".pdf,.doc,.docx"} required={field.required} /> :
              <Field compact label={label} helpText={helpText} name={key} defaultValue={defaults[key]} type={key === "weekly_hours" ? "number" : key === "date_of_birth" ? "date" : key === "intro_video_url" ? "url" : key === "phone" ? "tel" : "text"}
                required={field.required} min={key === "weekly_hours" ? 1 : undefined} max={key === "weekly_hours" ? 40 : undefined} step={key === "weekly_hours" ? 1 : undefined}
                maxLength={key === "intro_video_url" ? 2000 : key === "phone" ? 30 : key === "address" ? 300 : key === "organization" ? 150 : 100} />}
          </div>;
        })}
      </div>
    </section>
    {questions.length ? <section className="space-y-4 border-t border-slate-100 pt-5">
      <h3 className="text-lg font-semibold">{role === "teacher" ? "Experience, motivation and preferences" : "Your learning journey"}</h3>
      {questions.map(question => <div key={question.id}>
        {question.field_type === "select" || question.field_type === "boolean" ?
          <Select compact label={`${question.label}${question.required ? " *" : " (optional)"}`} helpText={question.help_text} name={`answer_${question.id}`} required={question.required} defaultValue="">
            <option value="">Choose an answer</option>
            {(question.field_type === "boolean" ? ["yes", "no"] : question.options).map(option => <option key={option} value={option}>{option}</option>)}
          </Select> : question.field_type === "long_text" ?
          <TextArea label={`${question.label}${question.required ? " *" : " (optional)"}`} helpText={question.help_text} name={`answer_${question.id}`} required={question.required} rows={3} maxLength={2000} /> :
          <Field compact label={`${question.label}${question.required ? " *" : " (optional)"}`} helpText={question.help_text} name={`answer_${question.id}`} required={question.required} type={question.field_type === "number" ? "number" : question.field_type === "url" ? "url" : "text"} min={question.field_type === "number" ? 0 : undefined} max={question.field_type === "number" ? 9999 : undefined} step={question.field_type === "number" ? 1 : undefined} maxLength={2000} />}
      </div>)}
    </section> : null}
    <p className="text-sm leading-6 text-slate-500">Your reviewed personal information, photo, video and answers are linked to your profile only after acceptance. Accepted teachers&apos; name, country, introduction and photo appear in the public teacher directory. Students have no public profile: contact details, address, birth date and application answers are visible only to ABVN admins, and teachers see a limited profile of students they teach.</p>
  </ApplicationSubmission>;
}
