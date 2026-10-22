begin;

-- Pre-tracking cancelled slots have no reliable booking flag. Remove only
-- cancelled slots with no current/prior applicant and no assessment history.
delete from public.interview_slots slot
where slot.status = 'cancelled'
  and slot.application_id is null
  and slot.last_application_id is null
  and not exists (
    select 1 from public.interview_assessments assessment
    where assessment.slot_id = slot.id
  );

create or replace function public.admin_cancel_interview_slot(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare slot public.interview_slots; app_id uuid;
begin
  perform public.require_role('admin');
  select application_id into app_id from public.interview_slots where id=p_slot_id;
  if app_id is not null then
    perform 1 from public.recruitment_applications where id=app_id for update;
  end if;
  select * into slot from public.interview_slots where id=p_slot_id for update;
  if not found then raise exception 'This interview slot no longer exists.'; end if;
  if slot.application_id is distinct from app_id then raise exception 'This slot just changed. Refresh before cancelling.'; end if;
  if slot.status='cancelled' then raise exception 'This interview slot is already cancelled.'; end if;
  if slot.application_id is null and slot.last_application_id is null
    and not exists (
      select 1 from public.interview_assessments assessment
      where assessment.slot_id = slot.id
    ) then
    delete from public.interview_slots where id=slot.id;
  else
    update public.interview_slots set status='cancelled',application_id=null where id=slot.id;
    if app_id is not null then
      update public.recruitment_applications set status='interview_invited',updated_at=now()
      where id=app_id and status='interview_booked';
    end if;
  end if;
end;
$$;

commit;
