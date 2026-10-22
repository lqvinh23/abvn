begin;

-- Compatible with projects that already applied the initial recruitment migration.
alter table public.recruitment_applications alter column cv_path drop not null;

create function public.recruitment_workflow_version() returns integer
language sql immutable set search_path = '' as $$ select 14; $$;
revoke execute on function public.recruitment_workflow_version() from public, anon;
grant execute on function public.recruitment_workflow_version() to authenticated;

drop policy if exists recruitment_documents_delete on storage.objects;
create policy recruitment_documents_delete on storage.objects for delete to authenticated
using (bucket_id = 'recruitment-documents' and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.recruitment_applications where cv_path = name));
drop policy if exists recruitment_photos_insert on storage.objects;
create policy recruitment_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles where id = auth.uid() and role is null and status in ('pending', 'rejected')));

create or replace function public.submit_recruitment_application(
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
    if p_date_of_birth is null then raise exception 'Enter your date of birth.'; end if;
    age_years := extract(year from age(current_date, p_date_of_birth))::integer;
    if age_years < 16 or age_years > 25 then raise exception 'Students must be between 16 and 25 years old to apply.'; end if;
  end if;
  if p_date_of_birth > current_date then raise exception 'Date of birth cannot be in the future.'; end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 100
    or p_country is null or char_length(btrim(p_country)) not between 1 and 100
    or p_phone is null or char_length(btrim(p_phone)) not between 1 and 30
    or p_intro is null or char_length(btrim(p_intro)) not between 1 and 4000
    or p_weekly_hours is null or p_weekly_hours not between 1 and 40
    or p_time_zone is null or not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the application fields. Hours per week must be between 1 and 40.';
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
    weekly_hours, intro_video_url, cv_path, photo_path, answers)
  values (auth.uid(), app_role, btrim(p_full_name), member.email, btrim(p_phone), btrim(p_country),
    p_time_zone, p_date_of_birth, btrim(p_intro), p_weekly_hours,
    nullif(btrim(coalesce(p_intro_video_url, '')), ''), p_cv_path, p_photo_path, snapshot)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_create_interview_slot(p_starts_at timestamptz, p_ends_at timestamptz, p_meeting_url text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform public.require_role('admin');
  if p_starts_at is null or p_ends_at is null or p_starts_at <= now() then raise exception 'Interview slots must start in the future.'; end if;
  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '2 hours' then
    raise exception 'Interview duration must be greater than zero and no longer than two hours.';
  end if;
  if exists (select 1 from public.interview_slots where status <> 'cancelled'
    and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) then
    raise exception 'This time overlaps another interview slot.';
  end if;
  insert into public.interview_slots(starts_at, ends_at, meeting_url) values (p_starts_at, p_ends_at, p_meeting_url) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_record_interview_result(p_application_id uuid, p_decision text, p_feedback text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications;
begin
  perform public.require_role('admin');
  select * into app from public.recruitment_applications where id = p_application_id for update;
  if not found or app.status <> 'interview_booked' then raise exception 'Only applicants with a booked interview can receive a final decision.'; end if;
  if p_decision is null or p_decision not in ('accept', 'reject') then raise exception 'Choose accept or reject.'; end if;
  if p_feedback is null or char_length(btrim(p_feedback)) not between 1 and 4000 then raise exception 'Write interview feedback (required, up to 4000 characters).'; end if;
  if not exists (select 1 from public.interview_slots where application_id = p_application_id and status = 'booked' and ends_at <= now()) then
    raise exception 'The interview has not ended yet.';
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
    update public.recruitment_applications set status = 'accepted', decided_at = now(), updated_at = now() where id = p_application_id;
  else
    update public.recruitment_applications set status = 'interview_rejected', decided_at = now(), updated_at = now() where id = p_application_id;
  end if;
end;
$$;

create or replace function public.request_membership(p_role public.account_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Use the teacher or student recruitment page to apply and complete an interview.';
end;
$$;

create or replace function public.review_member(p_user_id uuid, p_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role = 'admin' or p_user_id = auth.uid() then raise exception 'This account cannot be managed here.'; end if;
  if p_status is null or p_status not in ('approved', 'rejected', 'suspended') then raise exception 'Choose approve, reject, or suspend.'; end if;
  if p_status = 'approved' and member.role is null then raise exception 'New members must complete recruitment and receive a final interview decision.'; end if;
  update public.profiles set status = p_status where id = p_user_id;
end;
$$;

insert into public.recruitment_questions(role, label, help_text, field_type, options, required, position) values
  ('teacher', 'Why would you like to volunteer with ABVN?', 'Tell us what motivates you to support learners in Vietnam.', 'long_text', '{}', true, 10),
  ('teacher', 'Describe your teaching, tutoring or mentoring experience.', 'Include qualifications if relevant. New teachers are welcome to explain transferable skills.', 'long_text', '{}', true, 20),
  ('teacher', 'Which learners and topics do you enjoy teaching?', 'For example: beginners, conversation, pronunciation, work or study.', 'long_text', '{}', true, 30),
  ('teacher', 'How would you support a shy learner or adapt to a different English level?', '', 'long_text', '{}', true, 40),
  ('teacher', 'When are you usually available?', 'List weekdays and time windows in the time zone entered above.', 'long_text', '{}', true, 50),
  ('teacher', 'How long could you volunteer with ABVN?', '', 'select', array['Less than 3 months','3-6 months','6-12 months','More than 12 months'], true, 60),
  ('teacher', 'Do you have a reliable internet connection, camera and microphone?', '', 'boolean', '{}', true, 70),
  ('student', 'Why do you want to join ABVN, and what would you like to achieve?', '', 'long_text', '{}', true, 10),
  ('student', 'What is your current English level?', 'This is a self-assessment; we will discuss your level at the interview.', 'select', array['Not sure','A1','A2','B1','B2','C1','C2'], true, 20),
  ('student', 'Tell us about your studies, work and access to English learning.', 'Share only the background you are comfortable providing. Do not upload identity or financial documents unless ABVN requests them.', 'long_text', '{}', true, 30),
  ('student', 'When are you available for online lessons?', 'List weekdays and time windows in your time zone.', 'long_text', '{}', true, 40),
  ('student', 'Can you commit to regular lessons and complete feedback?', '', 'boolean', '{}', true, 50),
  ('student', 'Do you have a reliable internet connection, camera and microphone?', '', 'boolean', '{}', true, 60);

commit;
