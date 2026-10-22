import type { Profile, RecruitmentQuestion, RecruitmentRole } from "@/src/lib/platform/types";
import ApplicationSubmission from "./ApplicationSubmission";
import { Field, Select, TextArea } from "../platform/Fields";

export default function ApplicationForm({ role, profile, questions }: { role: RecruitmentRole; profile: Profile; questions: RecruitmentQuestion[] }) {
  return <ApplicationSubmission>
    <input type="hidden" name="role" value={role} />
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">About you</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field compact label="Full name" name="full_name" defaultValue={profile.full_name} maxLength={100} required autoComplete="name" />
        <Field compact label="Email (your signed-in account)" value={profile.email} readOnly type="email" />
        <Field compact label="Phone number" name="phone" type="tel" maxLength={30} required autoComplete="tel" />
        <Field compact label="Country" name="country" defaultValue={profile.country} maxLength={100} required autoComplete="country-name" />
        <Field compact label="IANA time zone" name="time_zone" defaultValue={profile.time_zone || "Asia/Ho_Chi_Minh"} maxLength={100} required />
        <Field compact label={role === "student" ? "Date of birth (ages 16-25)" : "Date of birth (optional)"} name="date_of_birth" type="date" required={role === "student"} />
        <Field compact label={role === "teacher" ? "Teaching hours per week" : "Learning hours per week"} name="weekly_hours" type="number" min={1} max={40} step={1} required />
      </div>
      <TextArea label={role === "teacher" ? "Introduce yourself and your teaching approach" : "Introduce yourself and your learning goals"} name="intro" rows={3} maxLength={4000} required />
    </section>
    <section className="space-y-4 border-t border-slate-100 pt-5">
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
    </section>
    <section className="space-y-4 border-t border-slate-100 pt-5">
      <h3 className="text-lg font-semibold">Attachments</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field compact label={role === "teacher" ? "Profile photo (required, up to 2 MB)" : "Photo (optional, up to 2 MB)"} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required={role === "teacher"} />
        <Field compact label={role === "teacher" ? "CV (required, up to 5 MB)" : "Supporting document (optional, up to 5 MB)"} name="cv" type="file" accept=".pdf,.doc,.docx" required={role === "teacher"} />
      </div>
      <Field compact label="Introduction video link (optional)" name="intro_video_url" type="url" placeholder="https://www.youtube.com/watch?v=..." maxLength={2000} />
      <p className="text-sm leading-6 text-slate-500">Use JPEG, PNG or WebP for photos; PDF, DOC or DOCX for documents. Videos must be YouTube, Vimeo or Google Drive links accessible to ABVN reviewers. Documents stay private to you and admins. Accepted teachers&apos; name, country, introduction and photo appear in the public teacher directory.</p>
      <p className="text-sm leading-6 text-slate-600">Review your answers before submitting. Changes after submission require contacting ABVN. Your progress and decision are available here; email notifications are not enabled.</p>
    </section>
  </ApplicationSubmission>;
}
