begin;

alter table public.recruitment_applications
  add column national_id_last8 text check (char_length(national_id_last8) = 8 and national_id_last8 ~ '^[0-9]{8}$'),
  add constraint student_national_id_only check (national_id_last8 is null or role = 'student');
alter table public.profile_application_details
  add column national_id_last8 text check (char_length(national_id_last8) = 8 and national_id_last8 ~ '^[0-9]{8}$');

-- Keep accepted identity claims even if an account is removed or its recorded ID is corrected.
create table public.student_identity_claims (
  national_id_last8 text primary key check (char_length(national_id_last8) = 8 and national_id_last8 ~ '^[0-9]{8}$'),
  student_id uuid not null,
  claimed_at timestamptz not null default now()
);
alter table public.student_identity_claims enable row level security;
revoke all on public.student_identity_claims from public, anon, authenticated;

create function public.check_student_identity(p_last8 text, p_student_id uuid, p_claim boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if p_last8 is null or char_length(p_last8) <> 8 or p_last8 !~ '^[0-9]{8}$' or p_student_id is null then
    raise exception 'Enter exactly the last 8 digits of the National / Citizen ID number.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('student-identity:' || p_last8, 0));
  if p_claim then
    insert into public.student_identity_claims(national_id_last8, student_id)
    values (p_last8, p_student_id) on conflict (national_id_last8) do nothing;
  end if;
  select student_id into owner_id from public.student_identity_claims where national_id_last8 = p_last8;
  if owner_id is not null and owner_id <> p_student_id then
    raise exception 'This ID is already linked to a previously accepted student. Contact ABVN if you believe this is an error.';
  end if;
end;
$$;

create function public.guard_student_application_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.national_id_last8 is distinct from old.national_id_last8 then
    raise exception 'Submitted identity details cannot be changed. Contact ABVN for corrections.';
  end if;
  if new.role = 'student' then
    if tg_op = 'INSERT' and new.national_id_last8 is null then
      raise exception 'Enter exactly the last 8 digits of your National / Citizen ID number.';
    end if;
    if new.national_id_last8 is not null and (tg_op = 'INSERT' or (new.status = 'accepted' and old.status <> 'accepted')) then
      perform public.check_student_identity(new.national_id_last8, new.applicant_id, new.status = 'accepted');
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_student_application_identity before insert or update of status, national_id_last8
on public.recruitment_applications for each row execute function public.guard_student_application_identity();

create function public.guard_student_profile_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.national_id_last8 is not distinct from old.national_id_last8 then return new; end if;
    if old.national_id_last8 is not null and new.national_id_last8 is null then
      raise exception 'A recorded student ID cannot be cleared. Enter a corrected 8-digit value instead.';
    end if;
  end if;
  if new.national_id_last8 is not null then
    if not exists (select 1 from public.profiles where id = new.profile_id and role = 'student')
      and not exists (select 1 from public.recruitment_applications where applicant_id = new.profile_id and role = 'student' and status = 'accepted') then
      raise exception 'Identity details can only be recorded for student profiles.';
    end if;
    perform public.check_student_identity(new.national_id_last8, new.profile_id, true);
  end if;
  return new;
end;
$$;
create trigger guard_student_profile_identity before insert or update of national_id_last8
on public.profile_application_details for each row execute function public.guard_student_profile_identity();

alter table public.recruitment_form_fields
  drop constraint recruitment_form_fields_field_key_check,
  drop constraint recruitment_form_fields_check;
alter table public.recruitment_form_fields add constraint recruitment_form_fields_field_key_check check (field_key in (
  'full_name','email','phone','country','time_zone','date_of_birth','weekly_hours','intro','photo','cv','intro_video_url',
  'city','address','occupation','organization','proficiency','goals','hobbies','national_id_last8'));
alter table public.recruitment_form_fields add constraint recruitment_form_fields_check check (not (
  field_key in ('full_name','email','phone','country','time_zone','intro')
  or (role = 'teacher' and field_key in ('weekly_hours','photo','cv'))
  or (role = 'student' and field_key in ('date_of_birth','city','address','occupation','organization','proficiency','goals','hobbies','national_id_last8'))
) or (required and active and not deleted));
alter table public.recruitment_form_fields add constraint student_identity_field_only
  check (field_key <> 'national_id_last8' or role = 'student');
update public.recruitment_form_fields set position = position + 1 where role = 'student' and position >= 4 and position < 1000;
insert into public.recruitment_form_fields(role, field_key, label, help_text, required, active, deleted, position)
values ('student','national_id_last8','National / Citizen ID number (last 8 digits)',
  'Enter only the last 8 digits, including any leading zeros. Do not enter your full ID number. Used privately by ABVN to prevent repeat enrolment.',
  true,true,false,4);

drop function public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text, text);
create function public.submit_recruitment_application(
  p_role text, p_full_name text, p_country text, p_time_zone text, p_phone text,
  p_date_of_birth date, p_intro text, p_weekly_hours integer, p_intro_video_url text,
  p_cv_path text, p_photo_path text, p_answers jsonb,
  p_city text default '', p_address text default '', p_occupation text default '', p_organization text default '',
  p_proficiency text default '', p_goals text default '', p_hobbies text default '',
  p_gender text default null, p_national_id_last8 text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  app_role public.account_role;
  owner_prefix text;
  question record;
  answer_value text;
  snapshot jsonb := '[]'::jsonb;
  age_years integer;
  min_age integer := public.platform_setting_int('student_min_age');
  max_age integer := public.platform_setting_int('student_max_age');
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to apply.' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('teacher', 'student') then raise exception 'Choose teacher or student.'; end if;
  app_role := p_role::public.account_role;
  owner_prefix := auth.uid()::text || '/';
  select * into member from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Your account is not ready yet. Refresh and try again.'; end if;
  if member.role is not null then raise exception 'Your account already has an ABVN role.'; end if;
  if member.status = 'suspended' then raise exception 'Your account is suspended. Contact ABVN.' using errcode = '42501'; end if;
  if exists (select 1 from public.recruitment_applications
    where applicant_id = auth.uid() and status in ('submitted', 'interview_invited', 'interview_booked')) then
    raise exception 'You already have an open application.';
  end if;
  if exists (select 1 from public.recruitment_applications
    where applicant_id = auth.uid() and status in ('review_rejected', 'interview_rejected') and reapply_allowed = false) then
    raise exception 'Your previous application is closed. ABVN must reopen it before you can apply again.';
  end if;
  if app_role = 'student' then
    if p_national_id_last8 is null or char_length(p_national_id_last8) <> 8 or p_national_id_last8 !~ '^[0-9]{8}$' then
      raise exception 'Enter exactly the last 8 digits of your National / Citizen ID number.';
    end if;
    if p_gender is null or p_gender not in ('male','female','other') then raise exception 'Choose your gender: Male, Female, or Other.'; end if;
    if p_date_of_birth is null then raise exception 'Enter your date of birth.'; end if;
    age_years := extract(year from age(current_date, p_date_of_birth))::integer;
    if age_years < min_age or age_years > max_age then
      raise exception 'Students must be between % and % years old to apply.', min_age, max_age;
    end if;
  elsif p_national_id_last8 is not null then
    raise exception 'National / Citizen ID details are only collected for student applications.';
  end if;
  if p_date_of_birth > current_date then raise exception 'Date of birth cannot be in the future.'; end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 100
    or p_country is null or char_length(btrim(p_country)) not between 1 and 100
    or p_phone is null or char_length(btrim(p_phone)) not between 1 and 30
    or p_intro is null or char_length(btrim(p_intro)) not between 1 and 4000
    or (app_role = 'teacher' and p_weekly_hours is null)
    or (p_weekly_hours is not null and p_weekly_hours not between 1 and 40)
    or p_time_zone is null or not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the application fields. Hours per week must be between 1 and 40.';
  end if;
  if char_length(btrim(coalesce(p_city, ''))) > 100 or char_length(btrim(coalesce(p_address, ''))) > 300
    or char_length(btrim(coalesce(p_occupation, ''))) > 100 or char_length(btrim(coalesce(p_organization, ''))) > 150
    or char_length(btrim(coalesce(p_goals, ''))) > 500 or char_length(btrim(coalesce(p_hobbies, ''))) > 500
    or coalesce(p_proficiency, '') not in ('', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2') then
    raise exception 'Check the city, address, occupation, organization, English level, goals and hobbies.';
  end if;
  if (app_role = 'teacher' and p_cv_path is null) or (p_cv_path is not null and
    (left(p_cv_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'recruitment-documents' and name = p_cv_path))) then
    raise exception 'Upload your CV before submitting.';
  end if;
  if app_role = 'teacher' and p_photo_path is null then raise exception 'Upload your profile photo.'; end if;
  if p_photo_path is not null and (left(p_photo_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_photo_path)) then
    raise exception 'Upload a valid profile photo or remove it.';
  end if;
  if nullif(btrim(coalesce(p_intro_video_url, '')), '') is not null
    and btrim(p_intro_video_url) !~ '^https://(www\.youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^[:space:]]+$' then
    raise exception 'Use a YouTube, Vimeo, or Google Drive link for the intro video.';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Answer the application questions.'; end if;
  for question in select * from public.recruitment_questions where role = app_role and active order by position, created_at loop
    answer_value := btrim(coalesce(p_answers ->> (question.id::text), ''));
    if answer_value = '' then
      if question.required then raise exception 'Please answer: %', question.label; end if;
    else
      if char_length(answer_value) > 2000 then raise exception 'The answer to "%" is too long.', question.label; end if;
      if question.field_type = 'number' and answer_value !~ '^[0-9]{1,4}$' then raise exception 'Enter a whole number for "%".', question.label; end if;
      if question.field_type = 'url' and answer_value !~ '^https://[^[:space:]]+$' then raise exception 'Enter a full https link for "%".', question.label; end if;
      if question.field_type = 'boolean' and answer_value not in ('yes', 'no') then raise exception 'Choose yes or no for "%".', question.label; end if;
      if question.field_type = 'select' and not (answer_value = any(question.options)) then raise exception 'Choose one of the listed options for "%".', question.label; end if;
    end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('question_id', question.id, 'label', question.label, 'answer', answer_value));
  end loop;
  insert into public.recruitment_applications(
    applicant_id, role, full_name, email, phone, country, time_zone, date_of_birth, intro,
    weekly_hours, intro_video_url, cv_path, photo_path, answers,
    city, address, occupation, organization, proficiency, goals, hobbies, gender, national_id_last8)
  values (auth.uid(), app_role, btrim(p_full_name), member.email, btrim(p_phone), btrim(p_country),
    p_time_zone, p_date_of_birth, btrim(p_intro), p_weekly_hours,
    nullif(btrim(coalesce(p_intro_video_url, '')), ''), p_cv_path, p_photo_path, snapshot,
    btrim(coalesce(p_city, '')), btrim(coalesce(p_address, '')), btrim(coalesce(p_occupation, '')),
    btrim(coalesce(p_organization, '')), coalesce(p_proficiency, ''), btrim(coalesce(p_goals, '')), btrim(coalesce(p_hobbies, '')),
    case when app_role = 'student' then p_gender end, p_national_id_last8)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.sync_accepted_application_details() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.profile_application_details(profile_id, phone, date_of_birth, weekly_hours, intro_video_url, answers, application_id, national_id_last8)
    values (new.applicant_id, new.phone, new.date_of_birth, new.weekly_hours, new.intro_video_url, new.answers, new.id, new.national_id_last8)
    on conflict (profile_id) do update set phone = excluded.phone, date_of_birth = excluded.date_of_birth,
      weekly_hours = excluded.weekly_hours, intro_video_url = excluded.intro_video_url,
      answers = excluded.answers, application_id = excluded.application_id,
      national_id_last8 = coalesce(excluded.national_id_last8, public.profile_application_details.national_id_last8);
    if new.role = 'student' then
      update public.profiles set
        city = coalesce(nullif(new.city, ''), city), address = coalesce(nullif(new.address, ''), address),
        occupation = coalesce(nullif(new.occupation, ''), occupation), organization = coalesce(nullif(new.organization, ''), organization),
        proficiency = coalesce(nullif(new.proficiency, ''), proficiency), teaching_focus = coalesce(nullif(new.goals, ''), teaching_focus),
        hobbies = coalesce(nullif(new.hobbies, ''), hobbies), cv_path = coalesce(new.cv_path, cv_path)
      where id = new.applicant_id and role = 'student';
    end if;
  end if;
  return new;
end;
$$;

alter function public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text)
rename to admin_save_student_before_identity;
revoke all on function public.admin_save_student_before_identity(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text)
from public, anon, authenticated;
create function public.admin_save_student(
  p_user_id uuid, p_name text, p_city text, p_address text, p_country text, p_time_zone text, p_bio text,
  p_hobbies text, p_goals text, p_occupation text, p_organization text, p_facebook_url text, p_proficiency text,
  p_participation_status text, p_study_expires_on date, p_phone text, p_date_of_birth date,
  p_intro_video_url text, p_reason text, p_avatar_path text default null, p_cv_path text default null,
  p_national_id_last8 text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare existing_id text; identity_value text;
begin
  perform public.require_role('admin');
  perform 1 from public.profiles where id = p_user_id and role = 'student' for update;
  if not found then raise exception 'Only student accounts can be edited here.'; end if;
  select national_id_last8 into existing_id from public.profile_application_details where profile_id = p_user_id;
  identity_value := case when p_national_id_last8 is null then existing_id else nullif(btrim(p_national_id_last8), '') end;
  if existing_id is not null and identity_value is null then
    raise exception 'A recorded student ID cannot be cleared. Enter a corrected 8-digit value instead.';
  end if;
  if identity_value is not null then perform public.check_student_identity(identity_value, p_user_id, true); end if;
  perform public.admin_save_student_before_identity(p_user_id, p_name, p_city, p_address, p_country, p_time_zone,
    p_bio, p_hobbies, p_goals, p_occupation, p_organization, p_facebook_url, p_proficiency,
    p_participation_status, p_study_expires_on, p_phone, p_date_of_birth, p_intro_video_url, p_reason, p_avatar_path, p_cv_path);
  update public.profile_application_details set national_id_last8 = identity_value where profile_id = p_user_id;
end;
$$;

alter function public.student_profile_report(uuid, text, boolean) rename to student_profile_report_before_identity;
revoke all on function public.student_profile_report_before_identity(uuid, text, boolean) from public, anon, authenticated;
create function public.student_profile_report(p_student_id uuid, p_time_zone text, p_admin boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare report jsonb; identity_value text;
begin
  report := public.student_profile_report_before_identity(p_student_id, p_time_zone, p_admin);
  if p_admin and report->'details' is distinct from 'null'::jsonb then
    select national_id_last8 into identity_value from public.profile_application_details where profile_id = p_student_id;
    report := jsonb_set(report, '{details}', (report->'details') || jsonb_build_object('national_id_last8', identity_value));
  end if;
  return report;
end;
$$;

revoke all on function public.check_student_identity(text, uuid, boolean),
  public.guard_student_application_identity(), public.guard_student_profile_identity(),
  public.student_profile_report(uuid, text, boolean),
  public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text, text, text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function
  public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text, text, text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text, text)
to authenticated;

commit;
