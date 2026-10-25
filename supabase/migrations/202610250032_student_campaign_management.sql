begin;

alter table public.student_recruitment_campaigns add column completed_at timestamptz;

create function public.admin_manage_student_campaign(p_campaign_id uuid, p_operation text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_operation is null or p_operation not in ('complete', 'delete') then
    raise exception 'Choose a valid campaign action.';
  end if;
  perform 1 from public.student_recruitment_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'This campaign no longer exists. Refresh and try again.'; end if;
  if p_operation = 'complete' then
    update public.student_recruitment_campaigns set completed_at = coalesce(completed_at, now())
    where id = p_campaign_id;
  else
    if exists (select 1 from public.recruitment_applications where campaign_id = p_campaign_id) then
      raise exception 'Campaigns with linked applications cannot be deleted.';
    end if;
    delete from public.student_recruitment_campaigns where id = p_campaign_id;
  end if;
exception
  when foreign_key_violation then raise exception 'Campaigns with linked applications cannot be deleted.';
end;
$$;

create or replace function public.assign_student_application_campaign() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.campaign_id is distinct from old.campaign_id then
      raise exception 'An application must remain linked to its original campaign.';
    end if;
  elsif new.role = 'student' then
    select c.id into new.campaign_id from public.student_recruitment_campaigns c
    where c.completed_at is null
      and (now() at time zone 'Asia/Ho_Chi_Minh')::date between c.form_opens_on and c.form_closes_on
    for share;
    if new.campaign_id is null then
      raise exception 'Student applications are closed. Please return during an open recruitment campaign.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_student_interview_campaign() returns trigger
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; campaign public.student_recruitment_campaigns;
begin
  if new.status <> 'booked' or new.application_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'booked' and old.application_id = new.application_id then return new; end if;
  select * into app from public.recruitment_applications where id = new.application_id;
  if app.role = 'student' then
    select * into campaign from public.student_recruitment_campaigns where id = app.campaign_id for share;
    if not found or campaign.completed_at is not null or (now() at time zone 'Asia/Ho_Chi_Minh')::date
      not between campaign.interview_opens_on and campaign.interview_closes_on then
      raise exception 'Interview booking is closed for this student recruitment campaign. Contact ABVN for assistance.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.admin_manage_student_campaign(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_manage_student_campaign(uuid, text) to authenticated;

commit;
