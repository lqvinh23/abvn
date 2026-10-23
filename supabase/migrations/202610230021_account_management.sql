begin;

create function public.admin_assign_member_role(p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  app public.recruitment_applications;
  has_open_application boolean := false;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to assign.'; end if;
  if p_role is null or p_role not in ('teacher', 'student') then
    raise exception 'Choose Teacher or Student.';
  end if;

  select * into member from public.profiles where id = p_user_id for update;
  if not found or member.role = 'admin' or p_user_id = auth.uid() then
    raise exception 'This account cannot be managed here.';
  end if;
  if member.role is not null then
    raise exception 'This account already has a role. Roles cannot be reassigned here.';
  end if;

  select * into app from public.recruitment_applications
  where applicant_id = p_user_id and status in ('submitted', 'interview_invited', 'interview_booked')
  for update;
  has_open_application := found;
  if has_open_application and app.role <> p_role then
    raise exception 'Close the existing % application before assigning a different role.', app.role;
  end if;

  if has_open_application then
    update public.interview_slots set status = 'cancelled', application_id = null
    where application_id = app.id and status = 'booked';
    insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
    values (app.id, auth.uid(), 'review', 'accept',
      'Account assigned and approved directly by an administrator; recruitment was bypassed.');
    update public.recruitment_applications set status = 'accepted', decided_at = now(), updated_at = now()
    where id = app.id;
  end if;

  update public.profiles set
    role = p_role,
    requested_role = null,
    status = 'approved',
    participation_status = 'active',
    full_name = case when has_open_application then app.full_name else full_name end,
    country = case when has_open_application then app.country else country end,
    time_zone = case when has_open_application then app.time_zone else time_zone end,
    bio = case when has_open_application then app.intro else bio end,
    avatar_path = case when has_open_application then coalesce(app.photo_path, avatar_path) else avatar_path end
  where id = p_user_id;
end;
$$;

create function public.admin_remove_member_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare member_role public.account_role;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to remove.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own account.'; end if;
  select role into member_role from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'This account no longer exists.';
  end if;
  if member_role = 'admin' then
    raise exception 'Administrator accounts cannot be removed here.';
  end if;
  if exists (select 1 from public.lesson_slots where teacher_id = p_user_id)
    or exists (select 1 from public.bookings where student_id = p_user_id)
    or exists (select 1 from public.lesson_feedback where author_id = p_user_id) then
    raise exception 'This account has lesson history and cannot be permanently removed.';
  end if;

  delete from public.interview_assessments
  where application_id in (select id from public.recruitment_applications where applicant_id = p_user_id);
  update public.interview_slots set
    status = case when application_id is not null then 'cancelled' else status end,
    application_id = null,
    last_application_id = null
  where application_id in (select id from public.recruitment_applications where applicant_id = p_user_id)
    or last_application_id in (select id from public.recruitment_applications where applicant_id = p_user_id);
  delete from storage.objects
  where bucket_id in ('avatars', 'recruitment-documents')
    and name like p_user_id::text || '/%';
  delete from auth.users where id = p_user_id;
  if not found then raise exception 'This account no longer exists.'; end if;
end;
$$;

revoke all on function public.admin_assign_member_role(uuid, public.account_role),
  public.admin_remove_member_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_assign_member_role(uuid, public.account_role),
  public.admin_remove_member_account(uuid) to authenticated;

commit;
