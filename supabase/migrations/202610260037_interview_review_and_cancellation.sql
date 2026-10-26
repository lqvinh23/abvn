begin;

create or replace function public.platform_setting_specs()
returns table(key text, label text, kind text, min_value numeric, max_value numeric, options text[], default_value jsonb)
language sql immutable set search_path = '' as $$
  select * from (values
    ('rule_time_zone', 'Rule time zone', 'timezone', null::numeric, null::numeric, null::text[], '"Asia/Ho_Chi_Minh"'::jsonb),
    ('weekly_standard_lessons', 'Standard lessons per week', 'integer', 1, 14, null, '2'::jsonb),
    ('weekly_max_lessons', 'Maximum lessons per week', 'integer', 1, 14, null, '4'::jsonb),
    ('extra_booking_hours', 'Extra lessons open hours before start', 'integer', 1, 168, null, '5'::jsonb),
    ('distinct_teachers_per_week', 'Different teacher for every lesson in a week', 'boolean', null, null, null, 'true'::jsonb),
    ('next_week_opens_day', 'Next-week booking opens on', 'integer', 1, 7, null, '6'::jsonb),
    ('next_week_opens_time', 'Next-week booking opens at', 'time', null, null, null, '"09:00"'::jsonb),
    ('require_feedback_before_booking', 'Feedback required before booking', 'boolean', null, null, null, 'true'::jsonb),
    ('student_cancel_cutoff_hours', 'Student cancellation cut-off hours', 'integer', 0, 720, null, '24'::jsonb),
    ('interview_cancel_cutoff_hours', 'Interview cancellation cut-off hours', 'integer', 0, 720, null, '24'::jsonb),
    ('education_affairs_email', 'Education Affairs team email', 'email', 0, 254, null, '"abettervietnam.ea@gmail.com"'::jsonb),
    ('absent_without_apology_action', 'Absent without apology', 'enum', null, null, array['none', 'suspended', 'banned'], '"banned"'::jsonb),
    ('absent_without_apology_days', 'Days restricted after absence without apology', 'integer', 0, 365, null, '0'::jsonb),
    ('absent_with_apology_action', 'Absent with apology', 'enum', null, null, array['none', 'suspended', 'banned'], '"suspended"'::jsonb),
    ('absent_with_apology_days', 'Days restricted after absence with apology', 'integer', 0, 365, null, '14'::jsonb),
    ('inactivity_weeks', 'Weeks without attending before inactivation', 'integer', 0, 52, null, '4'::jsonb),
    ('free_study_months', 'Free study period in months', 'integer', 1, 36, null, '6'::jsonb),
    ('enforce_study_expiry', 'Block booking after the study period', 'boolean', null, null, null, 'true'::jsonb),
    ('extension_months', 'Paid extension in months', 'integer', 1, 36, null, '6'::jsonb),
    ('extension_price_vnd', 'Price per lesson (VND)', 'integer', 0, 10000000, null, '30000'::jsonb),
    ('extension_min_lessons', 'Minimum lessons per package', 'integer', 1, 1000, null, '10'::jsonb),
    ('extension_max_lessons', 'Maximum lessons per package', 'integer', 1, 1000, null, '50'::jsonb),
    ('payment_bank_name', 'Bank name', 'text', 0, 100, null, '""'::jsonb),
    ('payment_account_name', 'Account holder', 'text', 0, 100, null, '""'::jsonb),
    ('payment_account_number', 'Account number', 'text', 0, 40, null, '""'::jsonb),
    ('payment_note', 'Transfer instructions', 'text', 0, 300, null, '""'::jsonb),
    ('student_min_age', 'Minimum student age', 'integer', 10, 100, null, '16'::jsonb),
    ('student_max_age', 'Maximum student age', 'integer', 10, 100, null, '25'::jsonb),
    ('teacher_publish_days_ahead', 'Days ahead teachers can publish lessons', 'integer', 7, 365, null, '180'::jsonb)
  ) as s(key, label, kind, min_value, max_value, options, default_value);
$$;

with latest_assessments as (
  select distinct on (assessment.application_id)
    assessment.application_id, assessment.admin_id, assessment.note, assessment.created_at, app.role
  from public.interview_assessments assessment
  join public.recruitment_applications app on app.id = assessment.application_id
  order by assessment.application_id, assessment.created_at desc, assessment.id desc
)
insert into public.student_application_reviews(application_id, round, decision, note, admin_id, revision, updated_at)
select latest.application_id, 'interview', null, latest.note, latest.admin_id, 1, latest.created_at
from latest_assessments latest where latest.role = 'student'
on conflict (application_id, round) do update set
  note = excluded.note, admin_id = excluded.admin_id,
  revision = public.student_application_reviews.revision + 1,
  updated_at = excluded.updated_at
where public.student_application_reviews.updated_at < excluded.updated_at;

with latest_assessments as (
  select distinct on (assessment.application_id)
    assessment.application_id, assessment.admin_id, assessment.note, assessment.created_at
  from public.interview_assessments assessment
  join public.recruitment_applications app on app.id = assessment.application_id
  where app.role = 'teacher'
  order by assessment.application_id, assessment.created_at desc, assessment.id desc
)
insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note, created_at)
select latest.application_id, latest.admin_id, 'interview', 'note', latest.note, latest.created_at
from latest_assessments latest
where not exists (
  select 1 from public.recruitment_feedback feedback
  where feedback.application_id = latest.application_id and feedback.stage = 'interview' and feedback.decision = 'note'
);

create function public.admin_save_interview_review_note(p_slot_id uuid, p_application_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
begin
  perform public.require_role('admin');
  if p_note is null or char_length(btrim(p_note)) not between 1 and 4000 then
    raise exception 'Enter an interview ABVN review note between 1 and 4000 characters.';
  end if;
  select * into app from public.recruitment_applications where id = p_application_id for update;
  if not found then raise exception 'Choose an existing application.'; end if;
  select * into slot from public.interview_slots
  where id = p_slot_id and application_id = p_application_id and status = 'booked' for update;
  if not found then raise exception 'The applicant or interview slot has changed. Refresh and try again.'; end if;

  if app.role = 'student' then
    insert into public.student_application_reviews(application_id, round, decision, note, admin_id, revision)
    values (app.id, 'interview', null, btrim(p_note), auth.uid(), 1)
    on conflict (application_id, round) do update set
      note = excluded.note, admin_id = excluded.admin_id,
      revision = public.student_application_reviews.revision + 1, updated_at = now();
  else
    insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
    values (app.id, auth.uid(), 'interview', 'note', btrim(p_note));
  end if;
  insert into public.interview_assessments(slot_id, application_id, admin_id, note)
  values (slot.id, app.id, auth.uid(), btrim(p_note));
end;
$$;

create function public.my_interview_booking_support()
returns table(contact_name text, contact_email text, cancel_cutoff_hours integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to view interview contact information.' using errcode = '42501'; end if;
  return query
  select coalesce(nullif(btrim(admin.full_name), ''), 'ABVN team'),
    coalesce(nullif(btrim(admin.email), ''), 'abettervnproject@gmail.com'),
    public.platform_setting_int('interview_cancel_cutoff_hours')
  from public.recruitment_applications app
  join public.interview_slots slot on slot.application_id = app.id and slot.status = 'booked'
  left join public.profiles admin on admin.id = slot.created_by
  where app.applicant_id = auth.uid() and app.status = 'interview_booked'
  limit 1;
end;
$$;

create or replace function public.cancel_interview_booking() returns void
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
  cutoff integer := public.platform_setting_int('interview_cancel_cutoff_hours');
  contact text;
begin
  if auth.uid() is null then raise exception 'Sign in to change your interview.' using errcode = '42501'; end if;
  select * into app from public.recruitment_applications
  where applicant_id = auth.uid() and status = 'interview_booked' for update;
  if not found then raise exception 'You have no booked interview to change.'; end if;
  select * into slot from public.interview_slots where application_id = app.id and status = 'booked' for update;
  if not found then raise exception 'This interview has already started or cannot be changed. Contact ABVN.'; end if;
  if slot.starts_at <= now() then raise exception 'This interview has already started. Contact your interviewer for help.'; end if;
  if slot.starts_at <= now() + make_interval(hours => cutoff) then
    select coalesce(nullif(btrim(admin.email), ''), 'ABVN') into contact
    from public.profiles admin where admin.id = slot.created_by;
    raise exception 'This interview cannot be cancelled within % hours of its start. Contact % for urgent changes.',
      cutoff, coalesce(contact, 'ABVN');
  end if;
  update public.interview_slots set status = 'available', application_id = null where id = slot.id;
  update public.recruitment_applications set status = 'interview_invited', updated_at = now() where id = app.id;
end;
$$;

revoke all on function public.admin_save_interview_review_note(uuid, uuid, text),
  public.my_interview_booking_support() from public, anon;
grant execute on function public.admin_save_interview_review_note(uuid, uuid, text),
  public.my_interview_booking_support() to authenticated;
grant execute on function public.cancel_interview_booking() to authenticated;

commit;
