begin;

create or replace function public.admin_activity_statistics(p_period text, p_anchor date)
returns table (
  period_start date,
  period_end date,
  granularity text,
  lesson_totals jsonb,
  lesson_series jsonb,
  teacher_totals jsonb,
  teacher_series jsonb,
  top_teachers jsonb,
  student_totals jsonb,
  student_series jsonb,
  top_students jsonb
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start date;
  v_end date;
  v_anchor date := coalesce(p_anchor, (now() at time zone 'UTC')::date);
  step interval;
  bucket_unit text;
begin
  perform public.require_role('admin');
  if p_period is null or p_period not in ('week', 'month', 'quarter', 'year') then
    raise exception 'Choose week, month, quarter or year.' using errcode = '22023';
  end if;

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
  step := case p_period
    when 'week' then interval '1 day'
    when 'month' then interval '1 day'
    when 'quarter' then interval '1 week'
    else interval '1 month'
  end;
  bucket_unit := case when p_period = 'quarter' then 'week'
    when p_period = 'year' then 'month' else 'day' end;

  return query
  with buckets as (
    select bucket::timestamp as bucket
    from generate_series(
      case when p_period = 'quarter' then date_trunc('week', v_start::timestamp) else v_start::timestamp end,
      case when p_period = 'quarter' then date_trunc('week', (v_end - 1)::timestamp) else v_end::timestamp - step end,
      step
    ) bucket
  ),
  period_slots as (
    select s.*, date_trunc(bucket_unit, s.starts_at at time zone 'UTC') as bucket
    from public.lesson_slots s
    where s.starts_at >= (v_start::timestamp at time zone 'UTC')
      and s.starts_at < (v_end::timestamp at time zone 'UTC')
  ),
  lesson_counts as (
    select bucket,
      count(*)::bigint as total,
      count(*) filter (where status = 'completed')::bigint as completed,
      count(*) filter (where status = 'booked')::bigint as booked,
      count(*) filter (where status = 'cancelled')::bigint as cancelled,
      count(*) filter (where status = 'available')::bigint as unbooked
    from period_slots group by bucket
  ),
  completed_by_teacher as (
    select s.teacher_id, count(distinct s.id)::bigint as completed_lessons,
      count(distinct b.student_id) filter (where b.attendance = 'present')::bigint as students_taught
    from period_slots s
    left join public.bookings b on b.slot_id = s.id and b.status = 'completed'
    where s.status = 'completed'
    group by s.teacher_id
  ),
  teacher_bucket as (
    select s.bucket, count(distinct s.id)::bigint as completed_lessons,
      count(distinct b.student_id) filter (where b.attendance = 'present')::bigint as students_taught
    from period_slots s
    left join public.bookings b on b.slot_id = s.id and b.status = 'completed'
    where s.status = 'completed'
    group by s.bucket
  ),
  completed_by_student as (
    select b.student_id, count(*) filter (where b.attendance = 'present')::bigint as lessons_attended
    from period_slots s
    join public.bookings b on b.slot_id = s.id and b.status = 'completed'
    where s.status = 'completed'
    group by b.student_id
  ),
  student_bucket as (
    select s.bucket, count(*) filter (where b.attendance = 'present')::bigint as lessons_attended
    from period_slots s
    join public.bookings b on b.slot_id = s.id and b.status = 'completed'
    where s.status = 'completed'
    group by s.bucket
  )
  select v_start, v_end, p_period,
    jsonb_build_object(
      'total', coalesce(sum(l.total), 0),
      'completed', coalesce(sum(l.completed), 0),
      'booked', coalesce(sum(l.booked), 0),
      'cancelled', coalesce(sum(l.cancelled), 0),
      'unbooked', coalesce(sum(l.unbooked), 0)
    ),
    coalesce((select jsonb_agg(jsonb_build_object(
      'label', case when p_period = 'year' then to_char(b.bucket, 'Mon') else to_char(b.bucket, 'DD Mon') end,
      'total', coalesce(l.total, 0),
      'completed', coalesce(l.completed, 0),
      'booked', coalesce(l.booked, 0),
      'cancelled', coalesce(l.cancelled, 0),
      'unbooked', coalesce(l.unbooked, 0)
    ) order by b.bucket) from buckets b left join lesson_counts l on l.bucket = b.bucket), '[]'::jsonb),
    jsonb_build_object(
      'active', (select count(*) from public.profiles where role = 'teacher' and status = 'approved' and participation_status = 'active'),
      'new', (select count(*) from public.profiles where role = 'teacher' and status = 'approved' and created_at >= (v_start::timestamp at time zone 'UTC') and created_at < (v_end::timestamp at time zone 'UTC')),
      'completed_lessons', (select coalesce(sum(completed_lessons), 0) from completed_by_teacher),
      'students_taught', (select count(distinct b.student_id) from period_slots s join public.bookings b on b.slot_id = s.id and b.status = 'completed' and b.attendance = 'present' where s.status = 'completed')
    ),
    coalesce((select jsonb_agg(jsonb_build_object(
      'label', case when p_period = 'year' then to_char(b.bucket, 'Mon') else to_char(b.bucket, 'DD Mon') end,
      'completed', coalesce(t.completed_lessons, 0),
      'students', coalesce(t.students_taught, 0)
    ) order by b.bucket) from buckets b left join teacher_bucket t on t.bucket = b.bucket), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'member_code', a.member_code, 'member_number', a.member_number,
      'full_name', a.full_name, 'completed_lessons', a.completed_lessons,
      'students_taught', a.students_taught
    ) order by a.completed_lessons desc, a.students_taught desc, a.full_name, a.id)
      from (select p.id, p.member_code, p.member_number, p.full_name,
          c.completed_lessons, c.students_taught
        from completed_by_teacher c
        join public.profiles p on p.id = c.teacher_id and p.role = 'teacher' and p.status = 'approved'
        order by c.completed_lessons desc, c.students_taught desc, p.full_name, p.id limit 10) a), '[]'::jsonb),
    jsonb_build_object(
      'active', (select count(*) from public.profiles where role = 'student' and status = 'approved' and participation_status = 'active'),
      'new', (select count(*) from public.profiles where role = 'student' and status = 'approved' and created_at >= (v_start::timestamp at time zone 'UTC') and created_at < (v_end::timestamp at time zone 'UTC')),
      'lessons_attended', (select coalesce(sum(lessons_attended), 0) from completed_by_student),
      'engaged', (select count(*) from completed_by_student where lessons_attended > 0)
    ),
    coalesce((select jsonb_agg(jsonb_build_object(
      'label', case when p_period = 'year' then to_char(b.bucket, 'Mon') else to_char(b.bucket, 'DD Mon') end,
      'lessons_attended', coalesce(s.lessons_attended, 0)
    ) order by b.bucket) from buckets b left join student_bucket s on s.bucket = b.bucket), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'member_code', a.member_code, 'member_number', a.member_number,
      'full_name', a.full_name, 'lessons_attended', a.lessons_attended
    ) order by a.lessons_attended desc, a.full_name, a.id)
      from (select p.id, p.member_code, p.member_number, p.full_name, c.lessons_attended
        from completed_by_student c
        join public.profiles p on p.id = c.student_id and p.role = 'student' and p.status = 'approved'
        where c.lessons_attended > 0
        order by c.lessons_attended desc, p.full_name, p.id limit 10) a), '[]'::jsonb)
  from buckets b left join lesson_counts l on l.bucket = b.bucket;
end;
$$;

create or replace function public.admin_activity_statistics(p_period text)
returns table (
  period_start date,
  period_end date,
  granularity text,
  lesson_totals jsonb,
  lesson_series jsonb,
  teacher_totals jsonb,
  teacher_series jsonb,
  top_teachers jsonb,
  student_totals jsonb,
  student_series jsonb,
  top_students jsonb
)
language sql stable security definer set search_path = '' as $$
  select * from public.admin_activity_statistics(p_period, (now() at time zone 'UTC')::date);
$$;

revoke all on function public.admin_activity_statistics(text, date) from public, anon, authenticated;
grant execute on function public.admin_activity_statistics(text, date) to authenticated;
revoke all on function public.admin_activity_statistics(text) from public, anon, authenticated;
grant execute on function public.admin_activity_statistics(text) to authenticated;

commit;
