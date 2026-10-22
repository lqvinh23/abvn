begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create type public.account_role as enum ('teacher', 'student', 'admin');
create type public.account_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.lesson_status as enum ('available', 'booked', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 1 and 100),
  role public.account_role,
  requested_role public.account_role check (requested_role in ('teacher', 'student')),
  status public.account_status not null default 'pending',
  time_zone text not null default 'Asia/Ho_Chi_Minh',
  country text not null default '',
  bio text not null default '' check (char_length(bio) <= 4000),
  teaching_focus text not null default '' check (char_length(teaching_focus) <= 500),
  hobbies text not null default '' check (char_length(hobbies) <= 500),
  proficiency text not null default '' check (proficiency in ('', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  avatar_path text,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or role is not null)
);

create table public.lesson_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_url text not null,
  status public.lesson_status not null default 'available',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '2 hours'),
  check (meeting_url ~ '^https://(meet\.google\.com|([a-zA-Z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|join\.skype\.com)/[^[:space:]]+$'),
  exclude using gist (
    teacher_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.lesson_slots(id),
  student_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.lesson_status not null default 'booked'
    check (status in ('booked', 'completed', 'cancelled')),
  attendance text check (attendance in ('present', 'absent')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (
    student_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create unique index one_live_booking_per_slot on public.bookings(slot_id)
  where status <> 'cancelled';
create index lesson_slots_upcoming on public.lesson_slots(starts_at) where status = 'available';

create table public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  author_id uuid not null references public.profiles(id),
  author_role public.account_role not null check (author_role in ('teacher', 'student')),
  rating integer check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (booking_id, author_id),
  check ((author_role = 'student' and rating is not null) or (author_role = 'teacher' and rating is null))
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'ABVN member'), 100)
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
insert into public.profiles(id, email, full_name)
select id, coalesce(email, ''),
  left(coalesce(nullif(raw_user_meta_data->>'full_name', ''), 'ABVN member'), 100)
from auth.users
on conflict (id) do nothing;

-- Approval and roles are always read from the database, never from OAuth metadata.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create function public.require_role(required_role public.account_role) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = required_role and status = 'approved'
  ) then
    raise exception 'An approved % account is required.', required_role using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.lesson_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.lesson_feedback enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy slots_read on public.lesson_slots for select to authenticated
using (public.is_admin() or (teacher_id = auth.uid() and exists (
  select 1 from public.profiles where id = auth.uid() and role = 'teacher' and status = 'approved'
)));
create policy bookings_read on public.bookings for select to authenticated
using (public.is_admin() or (student_id = auth.uid() and exists (
  select 1 from public.profiles where id = auth.uid() and role = 'student' and status = 'approved'
)) or exists (
  select 1 from public.lesson_slots s where s.id = slot_id and s.teacher_id = auth.uid()
));
create policy feedback_read on public.lesson_feedback for select to authenticated
using (public.is_admin() or author_id = auth.uid() or exists (
  select 1 from public.bookings b
  join public.lesson_slots s on s.id = b.slot_id
  where b.id = booking_id and (b.student_id = auth.uid() or s.teacher_id = auth.uid())
));

-- All writes go through narrow functions; users cannot update their own role.
revoke all on public.profiles, public.lesson_slots, public.bookings, public.lesson_feedback from anon, authenticated;
grant select on public.profiles, public.lesson_slots, public.bookings, public.lesson_feedback to authenticated;

create function public.request_membership(p_role public.account_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_role not in ('teacher', 'student') or p_role is null then
    raise exception 'Choose a teacher or student membership.' using errcode = '42501';
  end if;
  update public.profiles set requested_role = p_role
  where id = auth.uid() and role is null and status = 'pending' and requested_role is null;
  if not found then
    raise exception 'Your account already has a membership request or role.';
  end if;
end;
$$;

create function public.save_profile(
  p_name text, p_country text, p_bio text, p_time_zone text,
  p_focus text, p_hobbies text, p_proficiency text, p_avatar_path text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'approved') then
    raise exception 'An approved account is required.' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Choose a valid IANA time zone.';
  end if;
  if p_avatar_path is not null and p_avatar_path not like auth.uid()::text || '/%' then
    raise exception 'The profile image must belong to your account.';
  end if;
  if char_length(btrim(p_name)) not between 1 and 100 or char_length(p_country) > 100 then
    raise exception 'Check your name and country.';
  end if;
  update public.profiles set
    full_name = btrim(p_name), country = btrim(p_country), bio = btrim(p_bio),
    time_zone = p_time_zone, teaching_focus = btrim(p_focus),
    hobbies = btrim(p_hobbies), proficiency = p_proficiency, avatar_path = p_avatar_path
  where id = auth.uid();
end;
$$;

create function public.review_member(p_user_id uuid, p_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
begin
  perform public.require_role('admin');
  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role = 'admin' or p_user_id = auth.uid() then
    raise exception 'This account cannot be managed here.';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Choose approve, reject, or suspend.';
  end if;
  if p_status = 'approved' and coalesce(member.role, member.requested_role) is null then
    raise exception 'The member must request a role first.';
  end if;
  update public.profiles set status = p_status,
    role = case when p_status = 'approved' then coalesce(role, requested_role) else role end
  where id = p_user_id;
end;
$$;

create function public.create_lesson_slot(p_start timestamptz, p_end timestamptz, p_meeting_url text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare slot_id uuid;
begin
  perform public.require_role('teacher');
  if p_start <= now() or p_start > now() + interval '180 days' then
    raise exception 'Choose a future time within the next 180 days.';
  end if;
  insert into public.lesson_slots(teacher_id, starts_at, ends_at, meeting_url)
  values (auth.uid(), p_start, p_end, btrim(p_meeting_url)) returning id into slot_id;
  return slot_id;
exception when exclusion_violation then
  raise exception 'This time overlaps another lesson or available slot.';
end;
$$;

create function public.available_lessons()
returns table(id uuid, teacher_id uuid, teacher_name text, country text, bio text,
  teaching_focus text, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('student');
  return query select s.id, p.id, p.full_name, p.country, p.bio, p.teaching_focus, s.starts_at, s.ends_at
  from public.lesson_slots s join public.profiles p on p.id = s.teacher_id
  where s.status = 'available' and s.starts_at > now() and p.status = 'approved'
  order by s.starts_at limit 200;
end;
$$;

create function public.book_lesson(p_slot_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare slot public.lesson_slots; booking_id uuid;
begin
  perform public.require_role('student');
  select * into slot from public.lesson_slots where id = p_slot_id for update;
  if not found or slot.status <> 'available' or slot.starts_at <= now() then
    raise exception 'This lesson is no longer available. Please choose another time.';
  end if;
  if not exists (select 1 from public.profiles where id = slot.teacher_id and role = 'teacher' and status = 'approved') then
    raise exception 'This teacher is not currently available.';
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

create function public.cancel_lesson(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare slot public.lesson_slots; member public.profiles; booking public.bookings;
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
    if slot.starts_at <= now() + interval '12 hours' then
      raise exception 'Students must cancel more than 12 hours before a lesson. Contact ABVN for help.';
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

create function public.submit_lesson_feedback(
  p_booking_id uuid, p_comment text, p_rating integer, p_attendance text
) returns void language plpgsql security definer set search_path = '' as $$
declare booking public.bookings; slot public.lesson_slots; member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  -- Same lock order as cancellation: slot, then booking.
  select s.* into slot from public.lesson_slots s join public.bookings b on b.slot_id = s.id where b.id = p_booking_id for update of s;
  select * into booking from public.bookings where id = p_booking_id for update;
  if not found or booking.status = 'cancelled' or booking.ends_at > now() then
    raise exception 'Feedback is available only after a non-cancelled lesson ends.';
  end if;
  if member.role = 'teacher' and slot.teacher_id = auth.uid() then
    if p_attendance is null or p_attendance not in ('present', 'absent') or p_rating is not null then
      raise exception 'Select student attendance.';
    end if;
    update public.bookings set attendance = p_attendance, status = 'completed' where id = booking.id;
    update public.lesson_slots set status = 'completed' where id = slot.id;
  elsif member.role = 'student' and booking.student_id = auth.uid() then
    if p_rating is null or p_rating not between 1 and 5 or p_attendance is not null then
      raise exception 'Select a rating between 1 and 5.';
    end if;
  else
    raise exception 'Only the lesson participants can leave feedback.' using errcode = '42501';
  end if;
  insert into public.lesson_feedback(booking_id, author_id, author_role, comment, rating)
  values (booking.id, auth.uid(), member.role, btrim(p_comment), p_rating)
  on conflict (booking_id, author_id) do update set
    comment = excluded.comment, rating = excluded.rating;
end;
$$;

create function public.my_lessons()
returns table(
  slot_id uuid, booking_id uuid, teacher_name text, student_name text,
  starts_at timestamptz, ends_at timestamptz, slot_status public.lesson_status,
  booking_status public.lesson_status, meeting_url text, attendance text,
  teacher_comment text, student_comment text, student_rating integer
)
language plpgsql stable security definer set search_path = '' as $$
declare member public.profiles;
begin
  select * into member from public.profiles where id = auth.uid() and status = 'approved';
  if not found then raise exception 'An approved account is required.' using errcode = '42501'; end if;
  return query
  select s.id, b.id, t.full_name, st.full_name, s.starts_at, s.ends_at, s.status, b.status,
    case when member.role in ('teacher', 'admin') or
      (b.status in ('booked', 'completed') and t.status = 'approved' and st.status = 'approved')
      then s.meeting_url else null end,
    b.attendance, tf.comment, sf.comment, sf.rating
  from public.lesson_slots s
  join public.profiles t on t.id = s.teacher_id
  left join public.bookings b on b.slot_id = s.id
    and (member.role <> 'teacher' or s.status = 'cancelled' or b.status <> 'cancelled')
  left join public.profiles st on st.id = b.student_id
  left join public.lesson_feedback tf on tf.booking_id = b.id and tf.author_role = 'teacher'
  left join public.lesson_feedback sf on sf.booking_id = b.id and sf.author_role = 'student'
  where (member.role = 'student' and b.student_id = auth.uid())
     or (member.role = 'teacher' and s.teacher_id = auth.uid() and (b.id is null or b.status <> 'cancelled' or s.status = 'cancelled'))
     or member.role = 'admin'
  order by s.starts_at desc;
end;
$$;

-- Private profile images; signed URLs are issued to the image owner.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy avatar_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatar_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
);
create policy avatar_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.require_role(public.account_role) from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.request_membership(public.account_role),
  public.save_profile(text,text,text,text,text,text,text,text),
  public.review_member(uuid,public.account_status),
  public.create_lesson_slot(timestamptz,timestamptz,text),
  public.available_lessons(), public.book_lesson(uuid), public.cancel_lesson(uuid),
  public.submit_lesson_feedback(uuid,text,integer,text), public.my_lessons()
from public, anon;
grant execute on function public.request_membership(public.account_role),
  public.save_profile(text,text,text,text,text,text,text,text),
  public.review_member(uuid,public.account_status),
  public.create_lesson_slot(timestamptz,timestamptz,text),
  public.available_lessons(), public.book_lesson(uuid), public.cancel_lesson(uuid),
  public.submit_lesson_feedback(uuid,text,integer,text), public.my_lessons()
to authenticated;

commit;
