begin;

create or replace function public.admin_assign_member_role(p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
  app public.recruitment_applications;
  has_open_application boolean := false;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to assign.'; end if;
  if p_role is null or p_role not in ('teacher', 'student', 'admin') then
    raise exception 'Choose Teacher, Student, or Admin.';
  end if;
  select * into member from public.profiles where id = p_user_id for update;
  if not found then raise exception 'This account no longer exists.'; end if;

  if p_role in ('teacher', 'student') and member.role = p_role then
    if member.status <> 'approved' then
      raise exception 'This account must be approved before its role can be activated.';
    end if;
    update public.profiles set
      requested_role = null,
      participation_status = 'active'
    where id = p_user_id;
    return;
  end if;

  if p_role = 'admin' then
    if member.admin_access or member.role = 'admin' then
      raise exception 'This account already has Admin access.';
    end if;
    select * into app from public.recruitment_applications
    where applicant_id = p_user_id and status in ('submitted', 'interview_invited', 'interview_booked')
    for update;
    has_open_application := found and member.role is null;
    if has_open_application then
      update public.interview_slots set status = 'cancelled', application_id = null
      where application_id = app.id and status = 'booked';
      insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
      values (app.id, auth.uid(), 'review', 'reject',
        'Application closed because the account was directly granted Admin access.');
      update public.recruitment_applications set status = 'review_rejected', decided_at = now(), updated_at = now()
      where id = app.id;
    end if;
    update public.profiles set
      admin_access = true,
      role = case when member.role is null then 'admin'::public.account_role else member.role end,
      requested_role = null,
      status = case when member.role is null then 'approved'::public.account_status else member.status end,
      participation_status = case when member.role is null then 'active' else participation_status end,
      full_name = case when has_open_application then app.full_name else full_name end,
      country = case when has_open_application then app.country else country end,
      time_zone = case when has_open_application then app.time_zone else time_zone end,
      bio = case when has_open_application then app.intro else bio end,
      avatar_path = case when has_open_application then coalesce(app.photo_path, avatar_path) else avatar_path end
    where id = p_user_id;
    return;
  end if;

  if member.role is not null and member.role <> 'admin' then
    raise exception 'This account already has a role. Teacher and Student roles cannot be combined.';
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

create function public.admin_remove_member_role(p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare member public.profiles;
begin
  perform public.require_role('admin');
  if p_user_id is null then raise exception 'Choose an account to update.'; end if;
  if p_role is null or p_role not in ('teacher', 'student', 'admin') then
    raise exception 'Choose Teacher, Student, or Admin.';
  end if;
  select * into member from public.profiles where id = p_user_id for update;
  if not found then raise exception 'This account no longer exists.'; end if;

  if p_role in ('teacher', 'student') then
    if member.role is distinct from p_role then
      raise exception 'This account does not have a % role.', p_role;
    end if;
    update public.profiles set participation_status = 'inactive' where id = p_user_id;
    return;
  end if;

  if not member.admin_access then raise exception 'This account does not have Admin access.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own Admin access.'; end if;
  if member.status = 'approved' and not exists (
    select 1 from public.profiles
    where id <> p_user_id and status = 'approved' and (admin_access or role = 'admin')
  ) then
    raise exception 'The last approved Admin cannot be removed.';
  end if;
  update public.profiles set
    admin_access = false,
    role = case when member.role = 'admin' then null else role end,
    requested_role = case when member.role = 'admin' then null else requested_role end,
    status = case when member.role = 'admin' then 'pending'::public.account_status else status end
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_remove_member_role(uuid, public.account_role)
  from public, anon, authenticated;
grant execute on function public.admin_remove_member_role(uuid, public.account_role)
  to authenticated;

commit;
