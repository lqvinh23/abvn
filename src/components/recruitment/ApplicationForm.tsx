import type { Profile, RecruitmentQuestion, RecruitmentRole } from "@/src/lib/platform/types";
import type { ApplicationField } from "@/src/lib/platform/application-fields";
import ApplicationSubmission from "./ApplicationSubmission";
import { Field, Select, TextArea } from "../platform/Fields";

export default function ApplicationForm({ role, profile, questions, fields }: { role: RecruitmentRole; profile: Profile; questions: RecruitmentQuestion[]; fields: ApplicationField[] }) {
  const defaults: Record<string, string> = { full_name: profile.full_name, country: profile.country, time_zone: profile.time_zone || "Asia/Ho_Chi_Minh" };
  return <ApplicationSubmission>
    <input type="hidden" name="role" value={role} />
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">About you</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.filter(field => field.active && !field.deleted).toSorted((a, b) => a.position - b.position).map(field => {
          const key = field.field_key;
          const label = `${field.label}${field.required ? " *" : " (optional)"}`;
          return <div key={key} className={key === "intro" ? "sm:col-span-2" : ""}>
            {key === "intro" ? <TextArea label={label} name={key} rows={3} maxLength={4000} required={field.required} /> :
              key === "email" ? <Field compact label={label} value={profile.email} readOnly type="email" /> :
              key === "photo" || key === "cv" ? <Field compact label={label} name={key} type="file" accept={key === "photo" ? "image/jpeg,image/png,image/webp" : ".pdf,.doc,.docx"} required={field.required} /> :
              <Field compact label={label} name={key} defaultValue={defaults[key]} type={key === "weekly_hours" ? "number" : key === "date_of_birth" ? "date" : key === "intro_video_url" ? "url" : key === "phone" ? "tel" : "text"}
                required={field.required} min={key === "weekly_hours" ? 1 : undefined} max={key === "weekly_hours" ? 40 : undefined} step={key === "weekly_hours" ? 1 : undefined}
                maxLength={key === "intro_video_url" ? 2000 : key === "phone" ? 30 : 100} />}
            {field.help_text ? <p className="mt-1 text-sm text-slate-500">{field.help_text}</p> : null}
            {key === "photo" ? <p className="mt-1 text-xs text-slate-500">JPEG, PNG or WebP, up to 2 MB.</p> : key === "cv" ? <p className="mt-1 text-xs text-slate-500">PDF, DOC or DOCX, up to 5 MB. Private to you and admins.</p> : key === "intro_video_url" ? <p className="mt-1 text-xs text-slate-500">A YouTube, Vimeo or Google Drive link accessible to ABVN reviewers.</p> : key === "date_of_birth" && role === "student" ? <p className="mt-1 text-xs text-slate-500">Students must be aged 16-25.</p> : null}
          </div>;
        })}
      </div>
    </section>
    {questions.length ? <section className="space-y-4 border-t border-slate-100 pt-5">
      <h3 className="text-lg font-semibold">{role === "teacher" ? "Experience, motivation and preferences" : "Your learning journey"}</h3>
      {questions.map(question => <div key={question.id}>
        {question.field_type === "select" || question.field_type === "boolean" ?
          <Select compact label={`${question.label}${question.required ? " *" : " (optional)"}`} name={`answer_${question.id}`} required={question.required} defaultValue="">
            <option value="">Choose an answer</option>
            {(question.field_type === "boolean" ? ["yes", "no"] : question.options).map(option => <option key={option} value={option}>{option}</option>)}
          </Select> : question.field_type === "long_text" ?
          <TextArea label={`${question.label}${question.required ? " *" : " (optional)"}`} name={`answer_${question.id}`} required={question.required} rows={3} maxLength={2000} /> :
          <Field compact label={`${question.label}${question.required ? " *" : " (optional)"}`} name={`answer_${question.id}`} required={question.required} type={question.field_type === "number" ? "number" : question.field_type === "url" ? "url" : "text"} min={question.field_type === "number" ? 0 : undefined} max={question.field_type === "number" ? 9999 : undefined} step={question.field_type === "number" ? 1 : undefined} maxLength={2000} />}
        {question.help_text ? <p className="mt-1 text-sm text-slate-500">{question.help_text}</p> : null}
      </div>)}
    </section> : null}
    <p className="text-sm leading-6 text-slate-500">Your reviewed personal information, photo, video and answers are linked to your profile only after acceptance. Accepted teachers&apos; name, country, introduction and photo appear in the public teacher directory. Contact details, birth date and application answers remain private.</p>
  </ApplicationSubmission>;
}
