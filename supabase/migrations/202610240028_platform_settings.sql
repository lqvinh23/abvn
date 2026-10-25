begin;

-- Systems > Settings: every programme rule is a stored value with a validated default.
-- Rules enforced in the database read these values; nothing is hard-coded in the app.

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create table public.platform_settings_history (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  old_value jsonb,
  new_value jsonb,
  note text not null default '' check (char_length(note) <= 500),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index platform_settings_history_recent on public.platform_settings_history(changed_at desc);
alter table public.platform_settings enable row level security;
alter table public.platform_settings_history enable row level security;
revoke all on public.platform_settings, public.platform_settings_history from anon, authenticated;

create function public.platform_setting_specs()
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

create function public.platform_setting(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select o.value from public.platform_settings o where o.key = p_key),
    (select s.default_value from public.platform_setting_specs() s where s.key = p_key));
$$;
create function public.platform_setting_int(p_key text) returns integer
language sql stable security definer set search_path = '' as $$
  select (public.platform_setting(p_key) #>> '{}')::integer;
$$;
create function public.platform_setting_bool(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (public.platform_setting(p_key) #>> '{}')::boolean;
$$;
create function public.platform_setting_text(p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select public.platform_setting(p_key) #>> '{}';
$$;
create function public.platform_effective_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(s.key, coalesce(o.value, s.default_value))
  from public.platform_setting_specs() s left join public.platform_settings o on o.key = s.key;
$$;

create function public.platform_normalize_setting(p_key text, p_value jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare spec record; raw text;
begin
  select * into spec from public.platform_setting_specs() s where s.key = p_key;
  if not found then raise exception 'Unknown setting: %.', p_key; end if;
  if p_value is null then raise exception '% needs a value.', spec.label; end if;
  raw := p_value #>> '{}';
  if spec.kind = 'integer' then
    if jsonb_typeof(p_value) <> 'number' then raise exception '% must be a whole number.', spec.label; end if;
    if raw::numeric <> trunc(raw::numeric) or raw::numeric not between spec.min_value and spec.max_value then
      raise exception '% must be a whole number from % to %.', spec.label, spec.min_value, spec.max_value;
    end if;
    return to_jsonb(raw::integer);
  elsif spec.kind = 'boolean' then
    if jsonb_typeof(p_value) <> 'boolean' then raise exception '% must be on or off.', spec.label; end if;
    return p_value;
  end if;
  if jsonb_typeof(p_value) <> 'string' then raise exception '% must be text.', spec.label; end if;
  raw := btrim(raw);
  if spec.kind = 'text' then
    if char_length(raw) > spec.max_value then raise exception '% is too long (maximum % characters).', spec.label, spec.max_value::integer; end if;
  elsif spec.kind = 'email' then
    if raw <> '' and (char_length(raw) > spec.max_value or raw !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
      raise exception '% must be a valid email address or empty.', spec.label;
    end if;
  elsif spec.kind = 'time' then
    if raw !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception '% must be a 24-hour time such as 09:00.', spec.label; end if;
  elsif spec.kind = 'timezone' then
    if not exists (select 1 from pg_timezone_names where name = raw) then raise exception 'Choose a valid IANA time zone for %.', spec.label; end if;
  elsif spec.kind = 'enum' then
    if not (raw = any(spec.options)) then raise exception 'Choose a valid option for %.', spec.label; end if;
  end if;
  return to_jsonb(raw);
end;
$$;

revoke execute on function public.platform_setting_specs(), public.platform_setting(text),
  public.platform_setting_int(text), public.platform_setting_bool(text), public.platform_setting_text(text),
  public.platform_effective_settings(), public.platform_normalize_setting(text, jsonb)
  from public, anon, authenticated;

create function public.admin_platform_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  return jsonb_build_object(
    'values', public.platform_effective_settings(),
    'customized', coalesce((select jsonb_agg(o.key order by o.key) from public.platform_settings o), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('key', h.key, 'old_value', h.old_value,
        'new_value', h.new_value, 'note', h.note, 'changed_by', c.full_name, 'changed_at', h.changed_at)
        order by h.changed_at desc, h.id)
      from (select * from public.platform_settings_history order by changed_at desc limit 25) h
      left join public.profiles c on c.id = h.changed_by), '[]'::jsonb));
end;
$$;

create function public.admin_save_platform_settings(p_values jsonb, p_note text default '') returns integer
language plpgsql security definer set search_path = '' as $$
declare
  item record; normalized jsonb; merged jsonb; previous jsonb; changed integer := 0; note text := btrim(coalesce(p_note, ''));
begin
  perform public.require_role('admin');
  if p_values is null or jsonb_typeof(p_values) <> 'object' then raise exception 'Send the settings as a list of values.'; end if;
  if char_length(note) > 500 then raise exception 'The change note is too long (maximum 500 characters).'; end if;
  merged := public.platform_effective_settings();
  for item in select * from jsonb_each(p_values) loop
    merged := jsonb_set(merged, array[item.key], public.platform_normalize_setting(item.key, item.value));
  end loop;
  if (merged ->> 'weekly_max_lessons')::integer < (merged ->> 'weekly_standard_lessons')::integer then
    raise exception 'The maximum lessons per week cannot be lower than the standard lessons per week.';
  end if;
  if (merged ->> 'extension_max_lessons')::integer < (merged ->> 'extension_min_lessons')::integer then
    raise exception 'The maximum package size cannot be lower than the minimum package size.';
  end if;
  if (merged ->> 'student_max_age')::integer < (merged ->> 'student_min_age')::integer then
    raise exception 'The maximum student age cannot be lower than the minimum student age.';
  end if;
  for item in select * from jsonb_each(p_values) loop
    normalized := public.platform_normalize_setting(item.key, item.value);
    previous := public.platform_setting(item.key);
    if normalized is distinct from previous then
      insert into public.platform_settings(key, value, updated_at, updated_by)
      values (item.key, normalized, now(), auth.uid())
      on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
      insert into public.platform_settings_history(key, old_value, new_value, note, changed_by)
      values (item.key, previous, normalized, note, auth.uid());
      changed := changed + 1;
    end if;
  end loop;
  return changed;
end;
$$;

create function public.admin_reset_platform_settings() returns integer
language plpgsql security definer set search_path = '' as $$
declare item record; changed integer := 0;
begin
  perform public.require_role('admin');
  for item in select o.key, o.value from public.platform_settings o loop
    insert into public.platform_settings_history(key, old_value, new_value, note, changed_by)
    select item.key, item.value, s.default_value, 'Reset to defaults', auth.uid()
    from public.platform_setting_specs() s where s.key = item.key;
    changed := changed + 1;
  end loop;
  delete from public.platform_settings;
  return changed;
end;
$$;

-- Non-sensitive rules shown to signed-in members; payment details go to students and admins only.
create function public.member_policy_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare member public.profiles; summary jsonb;
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  summary := public.platform_effective_settings();
  if member.role = 'teacher' then
    summary := summary - 'payment_bank_name' - 'payment_account_name' - 'payment_account_number' - 'payment_note';
  end if;
  return summary;
end;
$$;

-- Students' own booking/cancellation/restriction rules.
alter table public.profiles
  add column restriction_ends_at timestamptz,
  add column last_activated_at timestamptz;
-- Existing students start a fresh inactivity period when this migration is applied.
update public.profiles set last_activated_at = now() where role = 'student';

create or replace function public.stamp_student_study_period() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and old.role is distinct from 'student' then
    new.student_joined_at := now();
    new.study_expires_on := ((now() + make_interval(months => public.platform_setting_int('free_study_months'))) at time zone 'UTC')::date;
    new.last_activated_at := now();
  elsif new.role is distinct from 'student' then
    new.student_joined_at := null;
    new.study_expires_on := null;
    new.restriction_ends_at := null;
    new.last_activated_at := null;
  end if;
  return new;
end;
$$;

-- Manual status changes by an admin end any timed restriction; automated changes set their own end date.
create function public.manage_student_restriction() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role = 'student' and new.participation_status is distinct from old.participation_status then
    if new.participation_status = 'active' then new.last_activated_at := now(); end if;
    if coalesce(current_setting('abvn.policy_action', true), '') <> 'on' then new.restriction_ends_at := null; end if;
  end if;
  return new;
end;
$$;
create trigger manage_student_restriction before update of participation_status on public.profiles
for each row execute function public.manage_student_restriction();

create or replace function public.record_student_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and old.participation_status is distinct from new.participation_status
    and (old.participation_status in ('banned', 'suspended') or new.participation_status in ('banned', 'suspended')) then
    insert into public.student_restriction_history(student_id, from_status, to_status, reason, changed_by)
    values (new.id, old.participation_status, new.participation_status,
      coalesce(nullif(btrim(current_setting('abvn.status_reason', true)), ''), ''),
      case when coalesce(current_setting('abvn.policy_action', true), '') = 'on' then null else auth.uid() end);
  end if;
  return new;
end;
$$;

create function public.set_student_status_by_policy(p_student uuid, p_status text, p_days integer, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('abvn.policy_action', 'on', true);
  perform set_config('abvn.status_reason', coalesce(p_reason, ''), true);
  update public.profiles set participation_status = p_status,
    restriction_ends_at = case when p_status in ('suspended', 'banned') and coalesce(p_days, 0) > 0
      then now() + p_days * interval '1 day' else null end
  where id = p_student and role = 'student';
  perform set_config('abvn.policy_action', '', true);
  perform set_config('abvn.status_reason', '', true);
end;
$$;

-- Restores finished temporary restrictions and inactivates students who stopped attending.
create function public.review_student_policies(p_student uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rec record; restored integer := 0; inactivated integer := 0; weeks integer := public.platform_setting_int('inactivity_weeks');
begin
  for rec in select p.id from public.profiles p
    where p.role = 'student' and p.participation_status in ('suspended', 'banned')
      and p.restriction_ends_at is not null and p.restriction_ends_at <= now()
      and (p_student is null or p.id = p_student)
    order by p.id for update of p
  loop
    perform public.set_student_status_by_policy(rec.id, 'active', 0, 'Automatic restoration: the restriction period has ended.');
    restored := restored + 1;
  end loop;
  if weeks > 0 then
    for rec in select p.id from public.profiles p
      where p.role = 'student' and p.status = 'approved' and p.participation_status = 'active'
        and (p_student is null or p.id = p_student)
        and greatest(
          coalesce(p.student_joined_at, p.created_at), coalesce(p.last_activated_at, p.created_at),
          coalesce((select max(b.ends_at) from public.bookings b
            where b.student_id = p.id and b.status = 'completed' and b.attendance = 'present'), '-infinity'::timestamptz)
        ) + weeks * interval '7 days' <= now()
      order by p.id for update of p
    loop
      perform public.set_student_status_by_policy(rec.id, 'inactive', 0, '');
      inactivated := inactivated + 1;
    end loop;
  end if;
  return jsonb_build_object('restored', restored, 'inactivated', inactivated);
end;
$$;

create function public.apply_attendance_policy(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  found_booking record; action text; days integer; current_status text; reason text;
  zone text := public.platform_setting_text('rule_time_zone');
begin
  select b.student_id, b.attendance, b.starts_at into found_booking from public.bookings b where b.id = p_booking_id;
  if not found then return; end if;
  if found_booking.attendance = 'absent' then
    action := public.platform_setting_text('absent_without_apology_action');
    days := public.platform_setting_int('absent_without_apology_days');
    reason := 'Automatic: absent without apology from the lesson on ';
  elsif found_booking.attendance = 'apologized' then
    action := public.platform_setting_text('absent_with_apology_action');
    days := public.platform_setting_int('absent_with_apology_days');
    reason := 'Automatic: absent with apology from the lesson on ';
  else
    return;
  end if;
  if action not in ('suspended', 'banned') then return; end if;
  select p.participation_status into current_status from public.profiles p
    where p.id = found_booking.student_id and p.role = 'student' for update;
  if not found then return; end if;
  -- Never lower an existing restriction; a ban outranks a suspension.
  if (case action when 'banned' then 2 else 1 end) <= (case current_status when 'banned' then 2 when 'suspended' then 1 else 0 end) then return; end if;
  perform public.set_student_status_by_policy(found_booking.student_id, action, days,
    reason || to_char(found_booking.starts_at at time zone zone, 'DD/MM/YYYY') || case when days > 0 then format('. Restricted for %s days.', days) else '. Restricted until an admin restores access.' end);
end;
$$;

create function public.review_my_student_policies() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'student') then
    return public.review_student_policies(auth.uid());
  end if;
  return jsonb_build_object('restored', 0, 'inactivated', 0);
end;
$$;

create function public.admin_run_policy_review() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  return public.review_student_policies(null);
end;
$$;

create or replace function public.require_study_access() returns void
language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() for update;
  if member.role = 'student' then
    perform public.review_student_policies(auth.uid());
    select * into member from public.profiles where id = auth.uid();
    if member.participation_status <> 'active' then
      raise exception 'Your study status allows read-only history only. Contact ABVN to restore Schedule and booking access.' using errcode = '42501';
    end if;
  end if;
end;
$$;

-- Teachers recording an unexcused or apologised absence triggers the configured restriction.
create or replace function public.submit_lesson_feedback(p_booking_id uuid, p_comment text, p_rating integer, p_attendance text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_study_access();
  perform public.member_submit_lesson_feedback(p_booking_id, p_comment, p_rating, p_attendance);
  if p_attendance in ('absent', 'apologized')
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    perform public.apply_attendance_policy(p_booking_id);
  end if;
end;
$$;

create or replace function public.member_book_lesson(p_slot_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  slot public.lesson_slots;
  student public.profiles;
  booking_id uuid;
  zone text := public.platform_setting_text('rule_time_zone');
  standard_limit integer := public.platform_setting_int('weekly_standard_lessons');
  max_limit integer := public.platform_setting_int('weekly_max_lessons');
  extra_hours integer := public.platform_setting_int('extra_booking_hours');
  week_local timestamp;
  opens_local timestamp;
  week_from timestamptz;
  week_to timestamptz;
  week_count integer;
  same_teacher boolean;
begin
  perform public.require_role('student');
  select * into student from public.profiles where id = auth.uid();
  select * into slot from public.lesson_slots where id = p_slot_id for update;
  if not found or slot.status <> 'available' or slot.starts_at <= now() then
    raise exception 'This lesson is no longer available. Please choose another time.';
  end if;
  if not exists (select 1 from public.profiles where id = slot.teacher_id and role = 'teacher' and status = 'approved') then
    raise exception 'This teacher is not currently available.';
  end if;

  if public.platform_setting_bool('enforce_study_expiry') and student.study_expires_on is not null
    and student.study_expires_on < (now() at time zone zone)::date then
    raise exception 'Your study period ended on %. To study for another % months, buy a package of % to % lessons at % VND per lesson and ask ABVN to extend your account.',
      to_char(student.study_expires_on, 'DD/MM/YYYY'), public.platform_setting_int('extension_months'),
      public.platform_setting_int('extension_min_lessons'), public.platform_setting_int('extension_max_lessons'),
      to_char(public.platform_setting_int('extension_price_vnd'), 'FM999,999,999');
  end if;

  if public.platform_setting_bool('require_feedback_before_booking') and exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status <> 'cancelled' and b.ends_at <= now()
      and coalesce(b.attendance, 'present') = 'present'
      and not exists (select 1 from public.lesson_feedback f where f.booking_id = b.id and f.author_id = auth.uid())
  ) then
    raise exception 'Please leave feedback for your previous lessons before booking another one. Open Feedback to write it.';
  end if;

  week_local := date_trunc('week', slot.starts_at at time zone zone);
  opens_local := week_local - interval '7 days' + (public.platform_setting_int('next_week_opens_day') - 1) * interval '1 day'
    + public.platform_setting_text('next_week_opens_time')::time::interval;
  if (now() at time zone zone) < opens_local then
    raise exception 'Lessons for the week starting % open for booking on % % at % (%).',
      to_char(week_local, 'DD/MM/YYYY'), to_char(opens_local, 'FMDay'), to_char(opens_local, 'DD/MM/YYYY'),
      to_char(opens_local, 'HH24:MI'), zone;
  end if;

  week_from := week_local at time zone zone;
  week_to := (week_local + interval '7 days') at time zone zone;
  select count(*), coalesce(bool_or(s.teacher_id = slot.teacher_id), false) into week_count, same_teacher
  from public.bookings b join public.lesson_slots s on s.id = b.slot_id
  where b.student_id = auth.uid() and b.status <> 'cancelled' and b.starts_at >= week_from and b.starts_at < week_to;
  if public.platform_setting_bool('distinct_teachers_per_week') and same_teacher then
    raise exception 'You already have a lesson with this teacher that week. Each lesson in a week must be with a different teacher.';
  end if;
  if week_count >= max_limit then
    raise exception 'You have reached the maximum of % lessons for that week.', max_limit;
  end if;
  if week_count >= standard_limit and slot.starts_at > now() + extra_hours * interval '1 hour' then
    raise exception 'You have booked your % standard lessons for that week. Extra lessons (up to %) can be booked only within % hours of the start if they are still available.',
      standard_limit, max_limit, extra_hours;
  end if;

  insert into public.bookings(slot_id, student_id, starts_at, ends_at)
  values (slot.id, auth.uid(), slot.starts_at, slot.ends_at) returning id into booking_id;
  update public.lesson_slots set status = 'booked' where id = slot.id;
  return booking_id;
exception when exclusion_violation then
  raise exception 'You already have a lesson during this time.';
when unique_violation then
  raise exception 'This lesson has just been booked. Please choose another time.';
end;
$$;

create or replace function public.member_cancel_lesson(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  slot public.lesson_slots; member public.profiles; booking public.bookings;
  cutoff integer := public.platform_setting_int('student_cancel_cutoff_hours');
  contact text := nullif(public.platform_setting_text('education_affairs_email'), '');
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  select * into slot from public.lesson_slots where id = p_slot_id for update;
  if not found then raise exception 'Lesson not found.'; end if;
  select * into booking from public.bookings where slot_id = slot.id and status <> 'cancelled' for update;
  if member.role = 'student' then
    if booking.student_id is distinct from auth.uid() or slot.status <> 'booked' then
      raise exception 'This booking is not yours to cancel.' using errcode = '42501';
    end if;
    if cutoff > 0 and slot.starts_at <= now() + cutoff * interval '1 hour' then
      raise exception 'Lessons cannot be cancelled within % hours of the start. To cancel, email your teacher and CC the ABVN Education Affairs (EA) team%.',
        cutoff, coalesce(' at ' || contact, '');
    end if;
  elsif member.role <> 'admin' and not (member.role = 'teacher' and slot.teacher_id = auth.uid()) then
    raise exception 'You cannot cancel this lesson.' using errcode = '42501';
  end if;
  if slot.status not in ('available', 'booked') or slot.starts_at <= now() then
    raise exception 'Only future available or booked lessons can be cancelled.';
  end if;
  update public.bookings set status = 'cancelled' where slot_id = slot.id and status = 'booked';
  update public.lesson_slots set status = case when member.role = 'student' then 'available'::public.lesson_status else 'cancelled'::public.lesson_status end
  where id = slot.id;
end;
$$;

create or replace function public.member_create_lesson_slot(p_start timestamptz, p_end timestamptz, p_meeting_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare slot_id uuid; horizon integer := public.platform_setting_int('teacher_publish_days_ahead');
begin
  perform public.require_role('teacher');
  if p_start <= now() or p_start > now() + horizon * interval '1 day' then
    raise exception 'Choose a future time within the next % days.', horizon;
  end if;
  insert into public.lesson_slots(teacher_id, starts_at, ends_at, meeting_url)
  values (auth.uid(), p_start, p_end, btrim(p_meeting_url)) returning id into slot_id;
  return slot_id;
exception when exclusion_violation then
  raise exception 'This time overlaps another lesson or available slot.';
end;
$$;

-- The student application now applies the configurable age range.
create or replace function public.submit_recruitment_application(
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
    if p_date_of_birth is null then raise exception 'Enter your date of birth.'; end if;
    age_years := extract(year from age(current_date, p_date_of_birth))::integer;
    if age_years < min_age or age_years > max_age then
      raise exception 'Students must be between % and % years old to apply.', min_age, max_age;
    end if;
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

revoke all on function public.manage_student_restriction(), public.set_student_status_by_policy(uuid, text, integer, text),
  public.review_student_policies(uuid), public.apply_attendance_policy(uuid) from public, anon, authenticated;
revoke execute on function public.admin_platform_settings(), public.admin_save_platform_settings(jsonb, text),
  public.admin_reset_platform_settings(), public.admin_run_policy_review(), public.member_policy_summary(),
  public.review_my_student_policies() from public, anon;
grant execute on function public.admin_platform_settings(), public.admin_save_platform_settings(jsonb, text),
  public.admin_reset_platform_settings(), public.admin_run_policy_review(), public.member_policy_summary(),
  public.review_my_student_policies() to authenticated;

-- Where the pg_cron extension is available, review student statuses hourly.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'abvn-student-policy-review';
    perform cron.schedule('abvn-student-policy-review', '15 * * * *', 'select public.review_student_policies()');
  end if;
exception when others then
  raise notice 'pg_cron could not be configured (%). Use Systems > Settings > Run policy review instead.', sqlerrm;
end;
$$;

commit;
