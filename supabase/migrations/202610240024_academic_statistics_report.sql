begin;

-- Replaces the earlier summary functions with one read-only, admin-only report.
-- Lessons are classified by slot status and the teacher-recorded attendance:
-- completed = present, absent, absent with apology, booked, unbooked, cancelled.
drop function if exists public.admin_activity_statistics_in_timezone(text, date, text);
drop function if exists public.admin_activity_statistics(text, date);
drop function if exists public.admin_activity_statistics(text);

create or replace function public.admin_academic_statistics(p_period text, p_anchor date, p_time_zone text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start date;
  v_end date;
  v_anchor date;
  v_unit text;
  v_from timestamptz;
  v_to timestamptz;
  v_series_from timestamptz;
  v_series_to timestamptz;
begin
  perform public.require_role('admin');
  if p_period is null or p_period not in ('week', 'month', 'quarter', 'year') then
    raise exception 'Choose week, month, quarter or year.' using errcode = '22023';
  end if;
  if p_time_zone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_time_zone
  ) then
    raise exception 'Choose a valid IANA time zone.' using errcode = '22023';
  end if;
  v_anchor := coalesce(p_anchor, (now() at time zone p_time_zone)::date);
  v_start := case p_period
    when 'week' then date_trunc('week', v_anchor)::date
    when 'month' then date_trunc('month', v_anchor)::date
    when 'quarter' then date_trunc('quarter', v_anchor)::date
    else date_trunc('year', v_anchor)::date
  end;
  v_end := case p_period
    when 'week' then v_start + 7
    when 'month' then (v_start + interval '1 month')::date
    when 'quarter' then (v_start + interval '3 months')::date
    else (v_start + interval '1 year')::date
  end;
  -- Chart buckets: week -> day, month -> week, quarter -> month, year -> quarter.
  v_unit := case p_period when 'week' then 'day' when 'month' then 'week' when 'quarter' then 'month' else 'quarter' end;
  v_from := v_start::timestamp at time zone p_time_zone;
  v_to := v_end::timestamp at time zone p_time_zone;
  -- Month charts show whole Monday-Sunday weeks, including days in neighbouring months.
  -- Totals, tables and distributions still cover only the selected period.
  v_series_from := (case when p_period = 'month' then date_trunc('week', v_start::timestamp) else v_start::timestamp end) at time zone p_time_zone;
  v_series_to := (case when p_period = 'month' then date_trunc('week', (v_end - 1)::timestamp) + interval '7 days' else v_end::timestamp end) at time zone p_time_zone;

  return (
    with buckets as (
      select g::timestamp as bucket,
        case v_unit
          when 'day' then to_char(g, 'Dy DD')
          when 'week' then to_char(g, 'DD Mon')
          when 'month' then to_char(g, 'Mon')
          else to_char(g, '"Q"Q')
        end as label
      from generate_series(
        case when v_unit = 'week' then date_trunc('week', v_start::timestamp) else v_start::timestamp end,
        case v_unit
          when 'day' then v_end::timestamp - interval '1 day'
          when 'week' then date_trunc('week', (v_end - 1)::timestamp)
          when 'month' then v_end::timestamp - interval '1 month'
          else v_end::timestamp - interval '3 months'
        end,
        case v_unit
          when 'day' then interval '1 day'
          when 'week' then interval '1 week'
          when 'month' then interval '1 month'
          else interval '3 months'
        end
      ) g
    ),
    period_slots as (
      select s.teacher_id, s.status as slot_status, b.student_id, b.attendance,
        date_trunc(v_unit, s.starts_at at time zone p_time_zone) as bucket
      from public.lesson_slots s
      left join public.bookings b on b.slot_id = s.id and b.status <> 'cancelled'
      where s.starts_at >= v_from and s.starts_at < v_to
    ),
    series_slots as (
      select s.teacher_id, s.status as slot_status, b.student_id, b.attendance,
        date_trunc(v_unit, s.starts_at at time zone p_time_zone) as bucket
      from public.lesson_slots s
      left join public.bookings b on b.slot_id = s.id and b.status <> 'cancelled'
      where s.starts_at >= v_series_from and s.starts_at < v_series_to
    ),
    lesson_counts as (
      select count(*)::bigint as total,
        count(*) filter (where slot_status = 'completed' and attendance = 'present')::bigint as completed,
        count(*) filter (where slot_status = 'booked')::bigint as booked,
        count(*) filter (where slot_status = 'available')::bigint as unbooked,
        count(*) filter (where slot_status = 'completed' and attendance = 'absent')::bigint as absent,
        count(*) filter (where slot_status = 'completed' and attendance = 'apologized')::bigint as apologized,
        count(*) filter (where slot_status = 'cancelled')::bigint as cancelled
      from period_slots
    ),
    lesson_series as (
      select bucket,
        count(*)::bigint as total,
        count(*) filter (where slot_status = 'completed' and attendance = 'present')::bigint as completed,
        count(*) filter (where slot_status = 'booked')::bigint as booked,
        count(*) filter (where slot_status = 'available')::bigint as unbooked,
        count(*) filter (where slot_status = 'completed' and attendance = 'absent')::bigint as absent,
        count(*) filter (where slot_status = 'completed' and attendance = 'apologized')::bigint as apologized,
        count(*) filter (where slot_status = 'cancelled')::bigint as cancelled
      from series_slots group by bucket
    ),
    teacher_bucket as (
      select bucket,
        count(*) filter (where slot_status <> 'cancelled')::bigint as total_lessons,
        count(*) filter (where slot_status = 'completed' and attendance = 'present')::bigint as completed_lessons,
        count(distinct teacher_id) filter (where slot_status <> 'cancelled')::bigint as engaged
      from series_slots group by bucket
    ),
    new_teacher_bucket as (
      select date_trunc(v_unit, p.created_at at time zone p_time_zone) as bucket, count(*)::bigint as new_teachers
      from public.profiles p
      where p.role = 'teacher' and p.status = 'approved' and p.created_at >= v_series_from and p.created_at < v_series_to
      group by 1
    ),
    teacher_rows as (
      select p.member_code, p.member_number, p.full_name,
        count(*) filter (where s.slot_status <> 'cancelled')::bigint as total_lessons,
        count(*) filter (where s.slot_status = 'completed' and s.attendance = 'present')::bigint as completed_lessons,
        count(distinct s.student_id) filter (where s.slot_status = 'completed' and s.attendance = 'present')::bigint as students_taught,
        p.id
      from period_slots s
      join public.profiles p on p.id = s.teacher_id and p.role = 'teacher'
      group by p.id, p.member_code, p.member_number, p.full_name
      having count(*) filter (where s.slot_status <> 'cancelled') > 0
    ),
    student_bucket as (
      select bucket,
        count(*) filter (where slot_status = 'completed' and attendance = 'present')::bigint as lessons_attended,
        count(distinct student_id) filter (where slot_status = 'completed' and attendance = 'present')::bigint as engaged
      from series_slots group by bucket
    ),
    student_attended as (
      select student_id, count(*)::int as attended
      from period_slots
      where slot_status = 'completed' and attendance = 'present' and student_id is not null
      group by student_id
    ),
    student_rows as (
      select p.member_code, p.member_number, p.full_name, a.attended::bigint as attended
      from student_attended a
      join public.profiles p on p.id = a.student_id and p.role = 'student'
    ),
    student_population as (
      select coalesce(a.attended, 0) as attended
      from public.profiles p
      left join student_attended a on a.student_id = p.id
      where p.role = 'student' and p.status = 'approved'
        and (p.participation_status = 'active' or coalesce(a.attended, 0) > 0)
    ),
    bin_count as (
      select least(10, greatest(4, ceil(coalesce(max(attended), 0) / 5.0)::int)) as n,
        coalesce(max(attended), 0) as m
      from student_population
    ),
    bins as (
      select 1 as ord, 0 as lo, 0 as hi, '0' as label
      union all select 2, 1, 1, '1' where p_period = 'week'
      union all select 3, 2, 2, '2' where p_period = 'week'
      union all select 4, 3, 3, '3' where p_period = 'week'
      union all select 5, 4, null, '4+' where p_period = 'week'
      union all select 2, 1, 3, '1–3' where p_period = 'month'
      union all select 3, 4, 8, '4–8' where p_period = 'month'
      union all select 4, 9, 16, '9–16' where p_period = 'month'
      union all select 5, 17, null, '17+' where p_period = 'month'
      union all
      select i + 1, (i - 1) * 5 + 1,
        case when i = c.n and c.m > c.n * 5 then null else i * 5 end,
        case when i = c.n and c.m > c.n * 5 then ((i - 1) * 5 + 1)::text || '+'
          else ((i - 1) * 5 + 1)::text || '–' || (i * 5)::text end
      from bin_count c, generate_series(1, c.n) i
      where p_period in ('quarter', 'year')
    ),
    restricted as (
      select p.member_code, p.member_number, p.full_name, p.participation_status,
        r.teacher_name, r.teacher_code, r.reported_at
      from public.profiles p
      left join lateral (
        select t.full_name as teacher_name, t.member_code as teacher_code,
          coalesce(f.created_at, bk.ends_at) as reported_at
        from public.bookings bk
        join public.lesson_slots sl on sl.id = bk.slot_id
        join public.profiles t on t.id = sl.teacher_id
        left join public.lesson_feedback f on f.booking_id = bk.id and f.author_id = sl.teacher_id
        where bk.student_id = p.id and bk.attendance in ('absent', 'apologized')
        order by coalesce(f.created_at, bk.ends_at) desc
        limit 1
      ) r on true
      where p.role = 'student' and p.participation_status in ('banned', 'suspended')
    )
    select jsonb_build_object(
      'period_start', v_start,
      'period_end', v_end,
      'granularity', p_period,
      'lessons', jsonb_build_object(
        'totals', jsonb_build_object(
          'total', coalesce((select total from lesson_counts), 0),
          'completed', coalesce((select completed from lesson_counts), 0),
          'booked', coalesce((select booked from lesson_counts), 0),
          'unbooked', coalesce((select unbooked from lesson_counts), 0),
          'absent', coalesce((select absent from lesson_counts), 0),
          'apologized', coalesce((select apologized from lesson_counts), 0),
          'cancelled', coalesce((select cancelled from lesson_counts), 0)
        ),
        'series', coalesce((select jsonb_agg(jsonb_build_object(
          'label', b.label,
          'total', coalesce(l.total, 0),
          'completed', coalesce(l.completed, 0),
          'booked', coalesce(l.booked, 0),
          'unbooked', coalesce(l.unbooked, 0),
          'absent', coalesce(l.absent, 0),
          'apologized', coalesce(l.apologized, 0),
          'cancelled', coalesce(l.cancelled, 0)
        ) order by b.bucket) from buckets b left join lesson_series l on l.bucket = b.bucket), '[]'::jsonb)
      ),
      'teachers', jsonb_build_object(
        'totals', jsonb_build_object(
          'total', (select count(*) from public.profiles where role = 'teacher' and status = 'approved' and participation_status = 'active'),
          'engaged', (select count(*) from teacher_rows),
          'new', (select count(*) from public.profiles where role = 'teacher' and status = 'approved' and created_at >= v_from and created_at < v_to)
        ),
        'series', coalesce((select jsonb_agg(jsonb_build_object(
          'label', b.label,
          'total_lessons', coalesce(t.total_lessons, 0),
          'completed_lessons', coalesce(t.completed_lessons, 0),
          'engaged', coalesce(t.engaged, 0),
          'new', coalesce(n.new_teachers, 0)
        ) order by b.bucket) from buckets b
          left join teacher_bucket t on t.bucket = b.bucket
          left join new_teacher_bucket n on n.bucket = b.bucket), '[]'::jsonb),
        'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'member_code', r.member_code, 'member_number', r.member_number, 'full_name', r.full_name,
          'total_lessons', r.total_lessons, 'completed_lessons', r.completed_lessons,
          'students_taught', r.students_taught
        ) order by r.total_lessons desc, r.completed_lessons desc, r.full_name, r.id) from teacher_rows r), '[]'::jsonb)
      ),
      'students', jsonb_build_object(
        'totals', jsonb_build_object(
          'active', (select count(*) from public.profiles where role = 'student' and status = 'approved' and participation_status = 'active'),
          'engaged', (select count(*) from student_rows),
          'restricted', (select count(*) from restricted)
        ),
        'series', coalesce((select jsonb_agg(jsonb_build_object(
          'label', b.label,
          'lessons_attended', coalesce(s.lessons_attended, 0),
          'engaged', coalesce(s.engaged, 0)
        ) order by b.bucket) from buckets b left join student_bucket s on s.bucket = b.bucket), '[]'::jsonb),
        'engaged_rows', coalesce((select jsonb_agg(jsonb_build_object(
          'member_code', r.member_code, 'member_number', r.member_number,
          'full_name', r.full_name, 'lessons_attended', r.attended
        ) order by r.attended desc, r.full_name, r.member_code) from student_rows r), '[]'::jsonb),
        'restricted_rows', coalesce((select jsonb_agg(jsonb_build_object(
          'member_code', r.member_code, 'member_number', r.member_number, 'full_name', r.full_name,
          'status', r.participation_status, 'teacher_name', r.teacher_name,
          'teacher_code', r.teacher_code, 'reported_at', r.reported_at
        ) order by r.member_number nulls last, r.full_name, r.member_code) from restricted r), '[]'::jsonb),
        'distribution', coalesce((select jsonb_agg(jsonb_build_object(
          'label', b.label,
          'students', (select count(*) from student_population sp
            where sp.attended >= b.lo and (b.hi is null or sp.attended <= b.hi))
        ) order by b.ord) from bins b), '[]'::jsonb)
      )
    )
  );
end;
$$;

revoke execute on function public.admin_academic_statistics(text, date, text) from public, anon;
grant execute on function public.admin_academic_statistics(text, date, text) to authenticated;

commit;
