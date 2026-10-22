begin;

-- Recruitment: application review, interview booking, and internal feedback for teachers and students.

create table public.recruitment_questions (
  id uuid primary key default gen_random_uuid(),
  role public.account_role not null check (role in ('teacher', 'student')),
  label text not null check (char_length(btrim(label)) between 1 and 300),
  help_text text not null default '' check (char_length(help_text) <= 500),
  field_type text not null check (field_type in ('short_text', 'long_text', 'number', 'select', 'boolean', 'url')),
  options text[] not null default '{}' check (cardinality(options) <= 20),
  required boolean not null default true,
  position integer not null default 0 check (position between 0 and 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((field_type = 'select') = (cardinality(options) > 0))
);
create index recruitment_questions_by_role on public.recruitment_questions(role, position) where active;

create table public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_role not null check (role in ('teacher', 'student')),
  status text not null default 'submitted' check (status in (
    'submitted', 'interview_invited', 'interview_booked', 'review_rejected', 'interview_rejected', 'accepted')),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  email text not null,
  phone text not null default '' check (char_length(phone) <= 30),
  country text not null default '' check (char_length(country) <= 100),
  time_zone text not null,
  date_of_birth date,
  intro text not null check (char_length(btrim(intro)) between 1 and 4000),
  weekly_hours integer not null check (weekly_hours between 1 and 40),
  intro_video_url text check (
    intro_video_url is null or intro_video_url ~ '^https://(www\.youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^[:space:]]+$'),
  cv_path text not null,
  photo_path text,
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  reapply_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  check (role <> 'student' or date_of_birth is not null)
);
-- One open application per applicant, across both roles.
create unique index one_open_recruitment_per_applicant on public.recruitment_applications(applicant_id)
  where status in ('submitted', 'interview_invited', 'interview_booked');
create index recruitment_applications_queue on public.recruitment_applications(status, created_at);

create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_url text not null check (meeting_url ~ '^https://(meet\.google\.com|([a-zA-Z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|join\.skype\.com)/[^[:space:]]+$'),
  status text not null default 'available' check (status in ('available', 'booked', 'cancelled')),
  application_id uuid unique references public.recruitment_applications(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '2 hours'),
  check ((status = 'booked') = (application_id is not null)),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (status <> 'cancelled')
);
create index interview_slots_upcoming on public.interview_slots(starts_at) where status = 'available';

-- Internal notes. Only admins can read these rows; applicants never see them.
create table public.recruitment_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  stage text not null check (stage in ('review', 'interview')),
  decision text not null check (decision in ('invite', 'reject', 'accept')),
  note text not null default '' check (char_length(note) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.recruitment_questions enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.interview_slots enable row level security;
alter table public.recruitment_feedback enable row level security;

revoke all on public.recruitment_questions, public.recruitment_applications,
  public.interview_slots, public.recruitment_feedback from anon, authenticated;
grant select on public.recruitment_questions, public.recruitment_applications,
  public.interview_slots, public.recruitment_feedback to authenticated;

create policy recruitment_questions_read on public.recruitment_questions for select to authenticated
using (active or public.is_admin());
create policy recruitment_applications_read on public.recruitment_applications for select to authenticated
using (applicant_id = auth.uid() or public.is_admin());
create policy recruitment_feedback_read on public.recruitment_feedback for select to authenticated
using (public.is_admin());
create policy interview_slots_read on public.interview_slots for select to authenticated
using (public.is_admin()
  or application_id in (select id from public.recruitment_applications where applicant_id = auth.uid())
  or (status = 'available' and exists (
    select 1 from public.recruitment_applications a
    where a.applicant_id = auth.uid() and a.status = 'interview_invited')));

-- Documents: CVs are private to the applicant and admins. Photos use the existing avatars bucket.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('recruitment-documents', 'recruitment-documents', false, 5242880,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy recruitment_documents_insert on storage.objects for insert to authenticated
with check (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy recruitment_documents_read on storage.objects for select to authenticated
using (bucket_id = 'recruitment-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy recruitment_photos_admin_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and public.is_admin());

create function public.submit_recruitment_application(
  p_role text, p_full_name text, p_country text, p_time_zone text, p_phone text,
  p_date_of_birth date, p_intro text, p_weekly_hours integer, p_intro_video_url text,
  p_cv_path text, p_photo_path text, p_answers jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  app_role public.account_role;
  owner_prefix text;
  question record;
  answer_value text;
  snapshot jsonb := '[]'::jsonb;
  age_years integer;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to apply.' using errcode = '42501'; end if;
  if p_role not in ('teacher', 'student') then raise exception 'Choose teacher or student.'; end if;
  app_role := p_role::public.account_role;
  owner_prefix := auth.uid()::text || '/';

  select * into member from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Your account is not ready yet. Refresh and try again.'; end if;
  if member.role is not null then raise exception 'Your account already has an ABVN role.'; end if;
  if exists (select 1 from public.recruitment_applications
    where applicant_id = auth.uid() and status in ('submitted', 'interview_invited', 'interview_booked')) then
    raise exception 'You already have an open application.';
  end if;
  if exists (select 1 from public.recruitment_applications
    where applicant_id = auth.uid() and status in ('review_rejected', 'interview_rejected') and reapply_allowed = false) then
    raise exception 'Your previous application is closed. ABVN must reopen it before you can apply again.';
  end if;

  if app_role = 'student' then
    if p_date_of_birth is null then raise exception 'Enter your date of birth.'; end if;
    age_years := extract(year from age(current_date, p_date_of_birth))::integer;
    if age_years < 16 or age_years > 25 then
      raise exception 'Students must be between 16 and 25 years old to apply.';
    end if;
  end if;

  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 100
    or p_country is null or char_length(p_country) > 100
    or p_phone is null or char_length(p_phone) > 30
    or p_intro is null or char_length(btrim(p_intro)) not between 1 and 4000
    or p_weekly_hours is null or p_weekly_hours not between 1 and 40
    or p_time_zone is null or not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the application fields. Hours per week must be between 1 and 40.';
  end if;

  if p_cv_path is null or left(p_cv_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'recruitment-documents' and name = p_cv_path) then
    raise exception 'Upload your CV before submitting.';
  end if;
  if p_photo_path is not null and (left(p_photo_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_photo_path)) then
    raise exception 'Upload a valid profile photo or remove it.';
  end if;
  if nullif(btrim(coalesce(p_intro_video_url, '')), '') is not null
    and btrim(p_intro_video_url) !~ '^https://(www\.youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^[:space:]]+$' then
    raise exception 'Use a YouTube, Vimeo, or Google Drive link for the intro video.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answer the application questions.';
  end if;
  for question in
    select * from public.recruitment_questions
    where role = app_role and active order by position, created_at
  loop
    answer_value := btrim(coalesce(p_answers ->> (question.id::text), ''));
    if answer_value = '' then
      if question.required then raise exception 'Please answer: %', question.label; end if;
    else
      if char_length(answer_value) > 2000 then raise exception 'The answer to "%" is too long.', question.label; end if;
      if question.field_type = 'number' and answer_value !~ '^[0-9]{1,4}$' then
        raise exception 'Enter a whole number for "%".', question.label;
      end if;
      if question.field_type = 'url' and answer_value !~ '^https://[^[:space:]]+$' then
        raise exception 'Enter a full https link for "%".', question.label;
      end if;
      if question.field_type = 'boolean' and answer_value not in ('yes', 'no') then
        raise exception 'Choose yes or no for "%".', question.label;
      end if;
      if question.field_type = 'select' and not (answer_value = any(question.options)) then
        raise exception 'Choose one of the listed options for "%".', question.label;
      end if;
    end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'question_id', question.id, 'label', question.label, 'answer', answer_value));
  end loop;

  insert into public.recruitment_applications(
    applicant_id, role, full_name, email, phone, country, time_zone, date_of_birth, intro,
    weekly_hours, intro_video_url, cv_path, photo_path, answers)
  values (
    auth.uid(), app_role, btrim(p_full_name), member.email, btrim(p_phone), btrim(p_country),
    p_time_zone, p_date_of_birth, btrim(p_intro), p_weekly_hours,
    nullif(btrim(coalesce(p_intro_video_url, '')), ''), p_cv_path, p_photo_path, snapshot)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.admin_save_recruitment_question(
  p_id uuid, p_role text, p_label text, p_help text, p_field_type text, p_options text[],
  p_required boolean, p_position integer, p_active boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  cleaned_options text[];
begin
  perform public.require_role('admin');
  if p_role not in ('teacher', 'student') then raise exception 'Choose a teacher or student form.'; end if;
  if p_field_type = 'select' then
    cleaned_options := coalesce(p_options, '{}');
    if cardinality(cleaned_options) = 0 or exists (
      select 1 from unnest(cleaned_options) as option_text where char_length(btrim(option_text)) not between 1 and 200
    ) then
      raise exception 'Dropdown questions need between 1 and 20 options of up to 200 characters.';
    end if;
  else
    cleaned_options := '{}';
  end if;
  if p_id is null then
    insert into public.recruitment_questions(role, label, help_text, field_type, options, required, position, active)
    values (p_role::public.account_role, btrim(p_label), btrim(coalesce(p_help, '')), p_field_type,
      cleaned_options, coalesce(p_required, true), coalesce(p_position, 0), coalesce(p_active, true))
    returning id into saved_id;
  else
    update public.recruitment_questions set role = p_role::public.account_role, label = btrim(p_label),
      help_text = btrim(coalesce(p_help, '')), field_type = p_field_type, options = cleaned_options,
      required = coalesce(p_required, true), position = coalesce(p_position, 0),
      active = coalesce(p_active, true), updated_at = now()
    where id = p_id returning id into saved_id;
    if saved_id is null then raise exception 'This question no longer exists.'; end if;
  end if;
  return saved_id;
end;
$$;

create function public.admin_review_application(p_application_id uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications;
begin
  perform public.require_role('admin');
  select * into app from public.recruitment_applications where id = p_application_id for update;
  if not found or app.status <> 'submitted' then raise exception 'Only submitted applications can be reviewed.'; end if;
  if p_decision is null or p_decision not in ('invite', 'reject') then raise exception 'Choose invite to interview or reject.'; end if;
  insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
  values (p_application_id, auth.uid(), 'review', p_decision, btrim(coalesce(p_note, '')));
  update public.recruitment_applications set
    status = case when p_decision = 'invite' then 'interview_invited' else 'review_rejected' end,
    decided_at = now(), updated_at = now()
  where id = p_application_id;
end;
$$;

create function public.admin_create_interview_slot(p_starts_at timestamptz, p_ends_at timestamptz, p_meeting_url text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform public.require_role('admin');
  if p_starts_at is null or p_ends_at is null or p_starts_at <= now() then
    raise exception 'Interview slots must start in the future.';
  end if;
  if exists (select 1 from public.interview_slots
    where status <> 'cancelled' and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) then
    raise exception 'This time overlaps another interview slot.';
  end if;
  insert into public.interview_slots(starts_at, ends_at, meeting_url)
  values (p_starts_at, p_ends_at, p_meeting_url)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.admin_cancel_interview_slot(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare booked_application uuid;
begin
  perform public.require_role('admin');
  select application_id into booked_application from public.interview_slots
  where id = p_slot_id and status <> 'cancelled' for update;
  if not found then raise exception 'This interview slot is already cancelled.'; end if;
  update public.interview_slots set status = 'cancelled', application_id = null where id = p_slot_id;
  if booked_application is not null then
    update public.recruitment_applications set status = 'interview_invited', updated_at = now()
    where id = booked_application and status = 'interview_booked';
  end if;
end;
$$;

create function public.book_interview_slot(p_slot_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
begin
  if auth.uid() is null then raise exception 'Sign in to book an interview.' using errcode = '42501'; end if;
  select * into app from public.recruitment_applications
  where applicant_id = auth.uid() and status = 'interview_invited' for update;
  if not found then raise exception 'Interview booking opens after your application is invited to interview.'; end if;
  select * into slot from public.interview_slots where id = p_slot_id and status = 'available' for update;
  if not found then raise exception 'That interview time is no longer available. Choose another time.'; end if;
  if slot.starts_at <= now() then raise exception 'That interview time has already started.'; end if;
  update public.interview_slots set status = 'booked', application_id = app.id where id = slot.id;
  update public.recruitment_applications set status = 'interview_booked', updated_at = now() where id = app.id;
  return slot.id;
end;
$$;

create function public.cancel_interview_booking() returns void
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
begin
  if auth.uid() is null then raise exception 'Sign in to change your interview.' using errcode = '42501'; end if;
  select * into app from public.recruitment_applications
  where applicant_id = auth.uid() and status = 'interview_booked' for update;
  if not found then raise exception 'You have no booked interview to change.'; end if;
  select * into slot from public.interview_slots where application_id = app.id and status = 'booked' for update;
  if not found or slot.starts_at <= now() then
    raise exception 'This interview has already started or cannot be changed. Contact ABVN.';
  end if;
  update public.interview_slots set status = 'available', application_id = null where id = slot.id;
  update public.recruitment_applications set status = 'interview_invited', updated_at = now() where id = app.id;
end;
$$;

create function public.admin_record_interview_result(p_application_id uuid, p_decision text, p_feedback text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications;
begin
  perform public.require_role('admin');
  select * into app from public.recruitment_applications where id = p_application_id for update;
  if not found or app.status <> 'interview_booked' then
    raise exception 'Only applicants with a booked interview can receive a final decision.';
  end if;
  if p_decision is null or p_decision not in ('accept', 'reject') then raise exception 'Choose accept or reject.'; end if;
  if p_feedback is null or char_length(btrim(p_feedback)) not between 1 and 4000 then
    raise exception 'Write interview feedback (required, up to 4000 characters).';
  end if;
  if not exists (select 1 from public.interview_slots
    where application_id = p_application_id and status = 'booked' and starts_at <= now()) then
    raise exception 'The interview has not started yet.';
  end if;

  insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
  values (p_application_id, auth.uid(), 'interview', p_decision, btrim(p_feedback));

  if p_decision = 'accept' then
    perform 1 from public.profiles where id = app.applicant_id and role is null for update;
    if not found then raise exception 'This applicant already has an ABVN role. Resolve it in member management first.'; end if;
    update public.profiles set role = app.role, status = 'approved', participation_status = 'active',
      requested_role = null, full_name = app.full_name, country = app.country, time_zone = app.time_zone,
      bio = app.intro, avatar_path = coalesce(app.photo_path, avatar_path)
    where id = app.applicant_id;
    update public.recruitment_applications set status = 'accepted', decided_at = now(), updated_at = now()
    where id = p_application_id;
  else
    update public.recruitment_applications set status = 'interview_rejected', decided_at = now(), updated_at = now()
    where id = p_application_id;
  end if;
end;
$$;

create function public.admin_reopen_application(p_application_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  update public.recruitment_applications set reapply_allowed = true, updated_at = now()
  where id = p_application_id and status in ('review_rejected', 'interview_rejected');
  if not found then raise exception 'Only rejected applications can be reopened.'; end if;
end;
$$;

revoke execute on function public.submit_recruitment_application(text,text,text,text,text,date,text,integer,text,text,text,jsonb),
  public.admin_save_recruitment_question(uuid,text,text,text,text,text[],boolean,integer,boolean),
  public.admin_review_application(uuid,text,text),
  public.admin_create_interview_slot(timestamptz,timestamptz,text),
  public.admin_cancel_interview_slot(uuid),
  public.book_interview_slot(uuid),
  public.cancel_interview_booking(),
  public.admin_record_interview_result(uuid,text,text),
  public.admin_reopen_application(uuid)
from public, anon;
grant execute on function public.submit_recruitment_application(text,text,text,text,text,date,text,integer,text,text,text,jsonb),
  public.admin_save_recruitment_question(uuid,text,text,text,text,text[],boolean,integer,boolean),
  public.admin_review_application(uuid,text,text),
  public.admin_create_interview_slot(timestamptz,timestamptz,text),
  public.admin_cancel_interview_slot(uuid),
  public.book_interview_slot(uuid),
  public.cancel_interview_booking(),
  public.admin_record_interview_result(uuid,text,text),
  public.admin_reopen_application(uuid)
to authenticated;

commit;
