begin;

lock table public.profiles in share row exclusive mode;
alter table public.profiles add column member_number integer check (member_number > 0);
create unique index profiles_role_number_unique on public.profiles(role, member_number);

-- Historical approval times were not recorded. Preserve existing accounts and
-- assign their initial numbers by creation order within each approved role.
with numbered as (
  select id, row_number() over (partition by role order by created_at, id)::integer as number
  from public.profiles where role in ('teacher', 'student')
)
update public.profiles p set member_number = n.number from numbered n where n.id = p.id;

create table public.member_number_counters (
  role public.account_role primary key check (role in ('teacher', 'student')),
  last_number integer not null check (last_number >= 0)
);
alter table public.member_number_counters enable row level security;
revoke all on public.member_number_counters from public, anon, authenticated;
insert into public.member_number_counters(role, last_number)
select roles.role, coalesce(max(p.member_number), 0)
from (values ('teacher'::public.account_role), ('student'::public.account_role)) roles(role)
left join public.profiles p on p.role = roles.role group by roles.role;

create function public.assign_member_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.member_number is not null then
    if new.member_number is distinct from old.member_number or new.role is distinct from old.role then
      raise exception 'An assigned member number and role cannot be changed.';
    end if;
  elsif new.status = 'approved' and new.role in ('teacher', 'student') then
    update public.member_number_counters set last_number = last_number + 1
      where role = new.role returning last_number into new.member_number;
  else
    new.member_number := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.assign_member_number() from public, anon, authenticated;
create trigger assign_member_number before insert or update on public.profiles
for each row execute function public.assign_member_number();

create function public.dashboard_calendar(p_from timestamptz, p_to timestamptz)
returns table (
  slot_id uuid, booking_id uuid, teacher_name text, student_name text,
  starts_at timestamptz, ends_at timestamptz, slot_status public.lesson_status,
  booking_status public.lesson_status, meeting_url text, attendance text,
  teacher_comment text, student_comment text, student_rating integer,
  teacher_code text, student_code text, title text, description text, can_book boolean,
  teacher_number integer, student_number integer,
  teacher_avatar_path text, student_avatar_path text
)
language sql stable security definer set search_path = '' as $$
  select l.*, t.member_number, s.member_number, t.avatar_path, s.avatar_path
  from public.dashboard_lessons(p_from, p_to) l
  join public.profiles t on t.member_code = l.teacher_code
  left join public.profiles s on s.member_code = l.student_code;
$$;
revoke execute on function public.dashboard_calendar(timestamptz,timestamptz) from public, anon;
grant execute on function public.dashboard_calendar(timestamptz,timestamptz) to authenticated;

create function public.can_read_member_avatar(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles viewer, public.profiles owner
    where viewer.id = auth.uid() and viewer.status = 'approved'
      and owner.avatar_path = p_path and (
        viewer.role = 'admin'
        or (owner.role = 'teacher' and owner.status = 'approved')
        or (viewer.role = 'teacher' and owner.role = 'student' and exists (
          select 1 from public.bookings b join public.lesson_slots l on l.id = b.slot_id
          where b.student_id = owner.id and l.teacher_id = viewer.id
        ))
      )
  );
$$;
revoke execute on function public.can_read_member_avatar(text) from public, anon;
grant execute on function public.can_read_member_avatar(text) to authenticated;
create policy avatars_participant_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and public.can_read_member_avatar(name));

create function public.member_profile_details(p_code text)
returns table (
  member_code text, full_name text, role public.account_role, country text,
  bio text, teaching_focus text, hobbies text, proficiency text, member_number integer
)
language sql stable security definer set search_path = '' as $$
  select m.*, p.member_number from public.member_profile(p_code) m
  join public.profiles p on p.member_code = m.member_code;
$$;
revoke execute on function public.member_profile_details(text) from public;
grant execute on function public.member_profile_details(text) to anon, authenticated;

create function public.teacher_student_directory()
returns table(member_code text, full_name text, country text, proficiency text, member_number integer)
language sql stable security definer set search_path = '' as $$
  select s.*, p.member_number from public.teacher_students() s
  join public.profiles p on p.member_code = s.member_code;
$$;
revoke execute on function public.teacher_student_directory() from public, anon;
grant execute on function public.teacher_student_directory() to authenticated;

commit;
