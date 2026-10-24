begin;

-- Student profile details and the reworked student application form.
alter table public.profiles
  add column address text not null default '' check (char_length(address) <= 300),
  add column occupation text not null default '' check (char_length(occupation) <= 100),
  add column organization text not null default '' check (char_length(organization) <= 150),
  add column facebook_url text not null default '' check (char_length(facebook_url) <= 300
    and (facebook_url = '' or facebook_url ~ '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.me)/[^[:space:]]+$')),
  add column cv_path text;

alter table public.recruitment_applications
  add column city text not null default '' check (char_length(city) <= 100),
  add column address text not null default '' check (char_length(address) <= 300),
  add column occupation text not null default '' check (char_length(occupation) <= 100),
  add column organization text not null default '' check (char_length(organization) <= 150),
  add column proficiency text not null default '' check (proficiency in ('', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  add column goals text not null default '' check (char_length(goals) <= 500),
  add column hobbies text not null default '' check (char_length(hobbies) <= 500),
  alter column weekly_hours drop not null;

-- Form configuration: students no longer provide weekly hours and supply the new profile fields.
alter table public.recruitment_form_fields
  drop constraint recruitment_form_fields_field_key_check,
  drop constraint recruitment_form_fields_check;
update public.recruitment_form_fields set required = false, active = false, deleted = true, position = 20
where role = 'student' and field_key = 'weekly_hours';
update public.recruitment_form_fields set label = 'Biography'
where role = 'student' and field_key = 'intro' and label = 'Personal introduction';
alter table public.recruitment_form_fields add constraint recruitment_form_fields_field_key_check check (field_key in (
  'full_name','email','phone','country','time_zone','date_of_birth','weekly_hours','intro','photo','cv','intro_video_url',
  'city','address','occupation','organization','proficiency','goals','hobbies'));
alter table public.recruitment_form_fields add constraint recruitment_form_fields_check check (not (
  field_key in ('full_name','email','phone','country','time_zone','intro')
  or (role = 'teacher' and field_key in ('weekly_hours','photo','cv'))
  or (role = 'student' and field_key in ('date_of_birth','city','address','occupation','organization','proficiency','goals','hobbies'))
) or (required and active and not deleted));

insert into public.recruitment_form_fields(role, field_key, label, required, active, deleted, position)
select 'student', k, l, true, true, false, n
from (values ('city','City / Province',5),('address','Detailed address',6),('occupation','Occupation',8),
  ('organization','Organization',9),('proficiency','English level',10),('goals','Learning goals',11),
  ('hobbies','Hobbies and interests',12)) f(k,l,n);
update public.recruitment_form_fields set position = case field_key when 'date_of_birth' then 3 when 'country' then 4
  when 'time_zone' then 7 when 'intro' then 13 when 'photo' then 14 when 'cv' then 15 when 'intro_video_url' then 16 else position end
where role = 'student' and field_key in ('date_of_birth','country','time_zone','intro','photo','cv','intro_video_url');
-- Teacher forms are unchanged; the student-only fields exist there as removed rows.
insert into public.recruitment_form_fields(role, field_key, label, required, active, deleted, position)
select 'teacher', k, l, false, false, true, n
from (values ('city','City / Province',11),('address','Detailed address',12),('occupation','Occupation',13),
  ('organization','Organization',14),('proficiency','English level',15),('goals','Learning goals',16),
  ('hobbies','Hobbies and interests',17)) f(k,l,n);

drop function public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb);
create function public.submit_recruitment_application(
  p_role text, p_full_name text, p_country text, p_time_zone text, p_phone text,
  p_date_of_birth date, p_intro text, p_weekly_hours integer, p_intro_video_url text,
  p_cv_path text, p_photo_path text, p_answers jsonb,
  p_city text default '', p_address text default '', p_occupation text default '', p_organization text default '',
  p_proficiency text default '', p_goals text default '', p_hobbies text default ''
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
    city, address, occupation, organization, proficiency, goals, hobbies)
  values (auth.uid(), app_role, btrim(p_full_name), member.email, btrim(p_phone), btrim(p_country),
    p_time_zone, p_date_of_birth, btrim(p_intro), p_weekly_hours,
    nullif(btrim(coalesce(p_intro_video_url, '')), ''), p_cv_path, p_photo_path, snapshot,
    btrim(coalesce(p_city, '')), btrim(coalesce(p_address, '')), btrim(coalesce(p_occupation, '')),
    btrim(coalesce(p_organization, '')), coalesce(p_proficiency, ''), btrim(coalesce(p_goals, '')), btrim(coalesce(p_hobbies, '')))
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text) to authenticated;

-- Accepting a student application copies the profile fields it collected.
create or replace function public.sync_accepted_application_details() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.profile_application_details(profile_id, phone, date_of_birth, weekly_hours, intro_video_url, answers, application_id)
    values (new.applicant_id, new.phone, new.date_of_birth, new.weekly_hours, new.intro_video_url, new.answers, new.id)
    on conflict (profile_id) do update set phone = excluded.phone, date_of_birth = excluded.date_of_birth,
      weekly_hours = excluded.weekly_hours, intro_video_url = excluded.intro_video_url,
      answers = excluded.answers, application_id = excluded.application_id;
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

-- Admins may upload a student's photo and CV on their behalf.
create policy avatars_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and public.is_admin());
create policy avatars_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and public.is_admin());
create policy recruitment_documents_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'recruitment-documents' and public.is_admin());
create policy recruitment_documents_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'recruitment-documents' and public.is_admin());

-- Teachers may open the CV of any student account (used on the student profile page).
create function public.teacher_can_read_student_cv(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and status = 'approved')
    and exists (select 1 from public.profiles where role = 'student' and cv_path = p_path);
$$;
create policy recruitment_documents_teacher_student_cv_read on storage.objects for select to authenticated
using (bucket_id = 'recruitment-documents' and public.teacher_can_read_student_cv(name));

-- One report feeds the admin and teacher profile pages. Teachers never receive private contact details.
create function public.student_profile_report(p_student_id uuid, p_time_zone text, p_admin boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return (
    with lessons as (
      select b.id as booking_id, b.starts_at, b.ends_at, b.status as booking_status, b.attendance,
        s.teacher_id, s.title, t.full_name as teacher_name, t.member_code as teacher_code
      from public.bookings b
      join public.lesson_slots s on s.id = b.slot_id
      join public.profiles t on t.id = s.teacher_id
      where b.student_id = p_student_id
    ),
    attended as (
      select l.*, row_number() over (order by l.starts_at) as nth
      from lessons l where l.booking_status = 'completed' and l.attendance = 'present'
    )
    select jsonb_build_object(
      'viewer', case when p_admin then 'admin' else 'teacher' end,
      'profile', (select jsonb_build_object(
        'id', p.id, 'member_code', p.member_code, 'member_number', p.member_number,
        'full_name', p.full_name, 'email', p.email, 'status', p.status,
        'participation_status', p.participation_status, 'time_zone', p.time_zone,
        'country', p.country, 'city', p.city, 'address', case when p_admin then p.address else '' end,
        'occupation', p.occupation, 'organization', p.organization,
        'facebook_url', case when p_admin then p.facebook_url else '' end,
        'bio', p.bio, 'goals', p.teaching_focus, 'hobbies', p.hobbies, 'proficiency', p.proficiency,
        'avatar_path', p.avatar_path, 'cv_path', p.cv_path,
        'created_at', p.created_at, 'student_joined_at', p.student_joined_at,
        'study_expires_on', p.study_expires_on) from public.profiles p where p.id = p_student_id),
      'details', (select jsonb_build_object('age', case when d.date_of_birth is null then null
          else date_part('year', age((now() at time zone p_time_zone)::date, d.date_of_birth))::int end,
        'intro_video_url', d.intro_video_url)
        || case when p_admin then jsonb_build_object('phone', d.phone, 'date_of_birth', d.date_of_birth) else '{}'::jsonb end
        from public.profile_application_details d where d.profile_id = p_student_id),
      'application', case when p_admin then (select jsonb_build_object('id', a.id, 'submitted_at', a.created_at,
        'decided_at', a.decided_at, 'intro', a.intro, 'country', a.country, 'time_zone', a.time_zone, 'answers', a.answers)
        from public.recruitment_applications a
        where a.applicant_id = p_student_id and a.role = 'student' and a.status = 'accepted'
        order by a.decided_at desc nulls last, a.created_at desc limit 1) end,
      'stats', (select jsonb_build_object(
        'attended', count(*) filter (where booking_status = 'completed' and attendance = 'present'),
        'attended_1w', count(*) filter (where booking_status = 'completed' and attendance = 'present'
          and starts_at >= now() - interval '7 days' and starts_at <= now()),
        'attended_4w', count(*) filter (where booking_status = 'completed' and attendance = 'present'
          and starts_at >= now() - interval '28 days' and starts_at <= now()),
        'absent', count(*) filter (where attendance = 'absent'),
        'apologized', count(*) filter (where attendance = 'apologized'),
        'cancelled', count(*) filter (where booking_status = 'cancelled'),
        'upcoming', count(*) filter (where booking_status = 'booked' and ends_at > now()),
        'hours', coalesce(round((sum(extract(epoch from ends_at - starts_at)) filter (
          where booking_status = 'completed' and attendance = 'present') / 3600.0)::numeric, 1), 0),
        'teachers', count(distinct teacher_id) filter (where booking_status = 'completed' and attendance = 'present'),
        'first_lesson_at', min(starts_at) filter (where booking_status = 'completed' and attendance = 'present'),
        'last_lesson_at', max(starts_at) filter (where booking_status = 'completed' and attendance = 'present')
      ) from lessons),
      'lessons', coalesce((select jsonb_agg(row_to_json(r)::jsonb order by r.starts_at desc) from (
        select starts_at, ends_at, title, teacher_name, teacher_code, booking_status, attendance
        from lessons order by starts_at desc limit 5000) r), '[]'::jsonb),
      'milestones', coalesce((select jsonb_agg(jsonb_build_object('count', a.nth, 'reached_at', a.starts_at) order by a.nth)
        from attended a where a.nth in (1, 5, 10, 25, 50, 100)), '[]'::jsonb),
      'feedback', coalesce((select jsonb_agg(row_to_json(f)::jsonb order by f.lesson_at desc) from (
        select fb.created_at, l.starts_at as lesson_at, l.teacher_name, l.teacher_code, l.title,
          l.attendance, fb.comment
        from public.lesson_feedback fb
        join lessons l on l.booking_id = fb.booking_id
        where fb.author_role = 'teacher' and fb.author_id = l.teacher_id
        order by l.starts_at desc limit 2000) f), '[]'::jsonb),
      'restrictions', case when p_admin then coalesce((select jsonb_agg(jsonb_build_object(
        'created_at', h.created_at, 'from_status', h.from_status, 'to_status', h.to_status,
        'reason', h.reason, 'changed_by', c.full_name) order by h.created_at desc)
        from public.student_restriction_history h
        left join public.profiles c on c.id = h.changed_by
        where h.student_id = p_student_id), '[]'::jsonb) else '[]'::jsonb end
    )
  );
end;
$$;

create or replace function public.admin_student_profile(p_code text, p_time_zone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_role('admin');
  if p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Choose a valid IANA time zone.' using errcode = '22023';
  end if;
  select id into v_id from public.profiles where member_code = p_code and role = 'student';
  if v_id is null then return null; end if;
  return public.student_profile_report(v_id, p_time_zone, true);
end;
$$;

create function public.teacher_student_profile(p_code text, p_time_zone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_role('teacher');
  if p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Choose a valid IANA time zone.' using errcode = '22023';
  end if;
  select p.id into v_id from public.profiles p where p.member_code = p_code and p.role = 'student';
  if v_id is null then return null; end if;
  return public.student_profile_report(v_id, p_time_zone, false);
end;
$$;

create function public.teacher_student_directory_details()
returns table (member_code text, member_number integer, full_name text, email text, participation_status text, country text, city text,
  proficiency text, created_at timestamptz, student_joined_at timestamptz, study_expires_on date,
  attended_total bigint, attended_1w bigint, attended_4w bigint, absent bigint, apologized bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('teacher');
  return query
    select p.member_code, p.member_number, p.full_name, p.email, p.participation_status, p.country, p.city, p.proficiency,
      p.created_at, p.student_joined_at, p.study_expires_on,
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '7 days' and b.starts_at <= now()),
      count(*) filter (where b.status = 'completed' and b.attendance = 'present'
        and b.starts_at >= now() - interval '28 days' and b.starts_at <= now()),
      count(*) filter (where b.attendance = 'absent'),
      count(*) filter (where b.attendance = 'apologized')
    from public.profiles p
    left join public.bookings b on b.student_id = p.id and b.status <> 'cancelled'
    where p.role = 'student'
    group by p.id
    order by p.member_number nulls last, p.member_code;
end;
$$;

drop function public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, date, text, date, integer, text, text);
create function public.admin_save_student(
  p_user_id uuid, p_name text, p_city text, p_address text, p_country text, p_time_zone text, p_bio text,
  p_hobbies text, p_goals text, p_occupation text, p_organization text, p_facebook_url text, p_proficiency text,
  p_participation_status text, p_study_expires_on date, p_phone text, p_date_of_birth date,
  p_intro_video_url text, p_reason text, p_avatar_path text default null, p_cv_path text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles; video text := nullif(btrim(coalesce(p_intro_video_url, '')), '');
  facebook text := btrim(coalesce(p_facebook_url, ''));
  owner_prefix text := p_user_id::text || '/';
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role is distinct from 'student' then
    raise exception 'Only student accounts can be edited here.';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100
    or p_city is null or char_length(btrim(p_city)) > 100
    or p_address is null or char_length(btrim(p_address)) > 300
    or p_country is null or char_length(btrim(p_country)) > 100
    or p_occupation is null or char_length(btrim(p_occupation)) > 100
    or p_organization is null or char_length(btrim(p_organization)) > 150
    or p_bio is null or char_length(p_bio) > 4000
    or p_hobbies is null or char_length(p_hobbies) > 500
    or p_goals is null or char_length(p_goals) > 500
    or p_proficiency is null or p_proficiency not in ('','A1','A2','B1','B2','C1','C2')
    or p_time_zone is null or not exists(select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Check the profile fields and choose a valid time zone.';
  end if;
  if facebook <> '' and facebook !~ '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.me)/[^[:space:]]+$' then
    raise exception 'Enter a full https Facebook link, or leave it empty.';
  end if;
  if p_participation_status is null or p_participation_status not in ('active','inactive','banned','suspended') then
    raise exception 'Choose a valid study status.';
  end if;
  if p_participation_status in ('banned','suspended') and p_participation_status <> member.participation_status
    and char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Enter a reason when suspending or banning a student.';
  end if;
  if char_length(coalesce(p_reason, '')) > 1000 then raise exception 'The reason is too long.'; end if;
  if p_study_expires_on is null or p_study_expires_on < coalesce(member.student_joined_at, member.created_at)::date then
    raise exception 'The study expiry date cannot be before the student joined.';
  end if;
  if char_length(coalesce(p_phone, '')) > 30
    or (p_date_of_birth is not null and (p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01'))
    or (video is not null and video !~ '^https://(www\.youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)/[^[:space:]]+$') then
    raise exception 'Check the phone number, date of birth and introduction video link.';
  end if;
  if p_avatar_path is not null and (left(p_avatar_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_avatar_path)) then
    raise exception 'The profile image upload could not be found. Upload it again.';
  end if;
  if p_cv_path is not null and (left(p_cv_path, char_length(owner_prefix)) <> owner_prefix
    or not exists (select 1 from storage.objects where bucket_id = 'recruitment-documents' and name = p_cv_path)) then
    raise exception 'The CV upload could not be found. Upload it again.';
  end if;
  perform set_config('abvn.status_reason', btrim(coalesce(p_reason, '')), true);
  update public.profiles set full_name = btrim(p_name), city = btrim(p_city), address = btrim(p_address),
    country = btrim(p_country), time_zone = p_time_zone, bio = btrim(p_bio), hobbies = btrim(p_hobbies),
    teaching_focus = btrim(p_goals), occupation = btrim(p_occupation), organization = btrim(p_organization),
    facebook_url = facebook, proficiency = p_proficiency, participation_status = p_participation_status,
    study_expires_on = p_study_expires_on, avatar_path = coalesce(p_avatar_path, avatar_path),
    cv_path = coalesce(p_cv_path, cv_path)
  where id = p_user_id;
  insert into public.profile_application_details(profile_id, phone, date_of_birth, weekly_hours, intro_video_url, answers)
  values (p_user_id, btrim(coalesce(p_phone, '')), p_date_of_birth, null, video, '[]'::jsonb)
  on conflict (profile_id) do update set phone = excluded.phone, date_of_birth = excluded.date_of_birth,
    intro_video_url = excluded.intro_video_url;
end;
$$;

revoke all on function public.student_profile_report(uuid, text, boolean),
  public.teacher_student_profile(text, text), public.teacher_student_directory_details(),
  public.teacher_can_read_student_cv(text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.teacher_student_profile(text, text), public.teacher_student_directory_details(),
  public.teacher_can_read_student_cv(text),
  public.admin_save_student(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, date, text, date, text, text, text, text)
  to authenticated;

commit;
