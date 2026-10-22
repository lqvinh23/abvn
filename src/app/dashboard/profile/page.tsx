import Image from "next/image";
import { requireMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import SetupNotice from "@/src/components/platform/SetupNotice";
import DashboardShell from "@/src/components/platform/DashboardShell";
import ActionForm from "@/src/components/platform/ActionForm";
import { Field, Select, TextArea } from "@/src/components/platform/Fields";
import { saveProfile } from "../actions";

export default async function ProfilePage() {
  if (!getSupabaseConfig())
    return (
      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <SetupNotice />
        </div>
      </main>
    );
  const { supabase, profile, requestTime } = await requireMember();
  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 300);
    if (error) {
      console.error("Profile image load failed:", error.name);
      throw new Error("Your profile image could not be loaded.");
    }
    avatarUrl = data.signedUrl;
  }
  return (
    <DashboardShell
      profile={profile}
      now={requestTime}
      title="My profile"
      description="Keep your details and time zone up to date. Approved teachers have a public member profile. Student profiles are private to the student, connected teachers, and administrators."
    >
      <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {profile.member_number != null ? <p className="mb-6 text-base font-medium capitalize text-slate-700">{profile.role} ID {profile.member_number}</p> : null}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Your profile picture"
            width={112}
            height={112}
            unoptimized
            className="mb-6 size-28 rounded-full object-cover"
          />
        ) : null}
        <ActionForm action={saveProfile} submitLabel="Save profile">
          <Field
            label="Full name"
            name="name"
            defaultValue={profile.full_name}
            required
            maxLength={100}
            autoComplete="name"
          />
          <Field
            label="Country"
            name="country"
            defaultValue={profile.country}
            maxLength={100}
            autoComplete="country-name"
          />
          <Field
            label="IANA time zone"
            name="time_zone"
            defaultValue={profile.time_zone}
            maxLength={100}
            required
            placeholder="Asia/Ho_Chi_Minh"
          />
          <p className="text-sm leading-6 text-slate-600">
            For example: Europe/London, America/New_York, or Asia/Ho_Chi_Minh.
            This controls how lesson times appear.
          </p>
          <TextArea
            label="Biography"
            name="bio"
            defaultValue={profile.bio}
            maxLength={4000}
            rows={5}
          />
          <Field
            label="Teaching preferences / learning goals"
            name="teaching_focus"
            defaultValue={profile.teaching_focus}
            maxLength={500}
          />
          <Field
            label="Hobbies and interests"
            name="hobbies"
            defaultValue={profile.hobbies}
            maxLength={500}
          />
          <Select
            label="English level"
            name="proficiency"
            defaultValue={profile.proficiency}
          >
            <option value="">Not specified</option>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
          <Field
            label="Profile picture (JPEG, PNG, or WebP, up to 2 MB)"
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
          />
          <p className="text-sm leading-6 text-slate-600">
            Your email and account role can only be managed through ABVN.
            Uploaded profile pictures are stored privately.
          </p>
        </ActionForm>
      </section>
    </DashboardShell>
  );
}
