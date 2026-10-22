begin;

create table public.admin_preferences (
  admin_id uuid primary key references public.profiles(id) on delete cascade,
  interview_meeting_url text not null default '',
  constraint valid_interview_meeting_url check (
    interview_meeting_url = '' or (
      length(interview_meeting_url) <= 2000 and
      interview_meeting_url ~ '^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|join\.skype\.com)/[^[:space:]]+$'
    )
  )
);
alter table public.admin_preferences enable row level security;
grant select on public.admin_preferences to authenticated;
create policy own_admin_preferences on public.admin_preferences for select to authenticated
  using (admin_id = auth.uid() and public.is_admin());

create function public.save_admin_profile(p_name text, p_country text, p_time_zone text, p_avatar_path text, p_meeting_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  perform public.require_role('admin');
  select * into strict member from public.profiles where id = auth.uid();
  perform public.save_profile(p_name, p_country, member.bio, p_time_zone,
    member.teaching_focus, member.hobbies, member.proficiency, p_avatar_path);
  insert into public.admin_preferences(admin_id, interview_meeting_url)
    values (auth.uid(), btrim(p_meeting_url))
    on conflict (admin_id) do update set interview_meeting_url = excluded.interview_meeting_url;
end;
$$;
revoke all on function public.save_admin_profile(text,text,text,text,text) from public, anon;
grant execute on function public.save_admin_profile(text,text,text,text,text) to authenticated;

create function public.admin_teacher_stat_order(p_query text, p_participation text, p_sort text, p_desc boolean, p_offset integer, p_limit integer)
returns setof public.profiles language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_sort not in ('completed', 'students') or p_sort is null or p_desc is null
    or p_offset is null or p_offset < 0 or p_limit is null or p_limit not in (10,25,50,100)
    or p_query is null or length(p_query) > 100
    or p_participation is null or p_participation not in ('','active','inactive','guest') then
    raise exception 'Invalid directory sort or filter.' using errcode = '22023';
  end if;
  return query
    select p.* from public.profiles p
    where p.role = 'teacher' and p.status = 'approved'
      and (p_participation = '' or p.participation_status::text = p_participation)
      and (p_query = '' or case when p_query ~ '^[0-9]{1,9}$'
        then p.member_number = p_query::bigint
        else strpos(lower(p.full_name), lower(p_query)) > 0 end)
    order by (case when p_sort = 'completed'
      then (select count(*) from public.lesson_slots s where s.teacher_id = p.id and s.status = 'completed')
      else (select count(distinct b.student_id) from public.lesson_slots s join public.bookings b on b.slot_id=s.id
        where s.teacher_id=p.id and s.status='completed' and b.status='completed' and b.attendance='present')
      end) * (case when p_desc then -1 else 1 end), p.id
    limit p_limit offset p_offset;
end;
$$;
revoke all on function public.admin_teacher_stat_order(text,text,text,boolean,integer,integer) from public, anon;
grant execute on function public.admin_teacher_stat_order(text,text,text,boolean,integer,integer) to authenticated;

commit;
