begin;

with cancelled_applications as (
  select distinct coalesce(slot.last_application_id, assessment.application_id) as application_id
  from public.interview_slots slot
  left join public.interview_assessments assessment on assessment.slot_id = slot.id
  where slot.status = 'cancelled'
    and coalesce(slot.last_application_id, assessment.application_id) is not null
    and not exists (
      select 1 from public.interview_slots active_slot
      where active_slot.application_id = coalesce(slot.last_application_id, assessment.application_id)
        and active_slot.status = 'booked'
    )
)
update public.student_application_reviews review set
  note = '', revision = review.revision + 1, updated_at = now()
where review.round = 'interview' and review.note <> ''
  and review.application_id in (select application_id from cancelled_applications);

with cancelled_applications as (
  select distinct coalesce(slot.last_application_id, assessment.application_id) as application_id
  from public.interview_slots slot
  left join public.interview_assessments assessment on assessment.slot_id = slot.id
  where slot.status = 'cancelled'
    and coalesce(slot.last_application_id, assessment.application_id) is not null
    and not exists (
      select 1 from public.interview_slots active_slot
      where active_slot.application_id = coalesce(slot.last_application_id, assessment.application_id)
        and active_slot.status = 'booked'
    )
)
delete from public.recruitment_feedback feedback
where feedback.stage = 'interview' and feedback.decision = 'note'
  and feedback.application_id in (select application_id from cancelled_applications);

delete from public.interview_assessments assessment using public.interview_slots slot
where assessment.slot_id = slot.id and slot.status = 'cancelled';

alter function public.admin_save_student_application_review(uuid, text, text, text, integer)
  rename to admin_save_student_application_review_without_slot_sync;
revoke all on function public.admin_save_student_application_review_without_slot_sync(uuid, text, text, text, integer)
  from public, anon, authenticated;

create function public.admin_save_student_application_review(
  p_application_id uuid, p_round text, p_decision text, p_note text, p_revision integer
) returns void language plpgsql security definer set search_path = '' as $$
declare slot public.interview_slots;
begin
  perform public.admin_save_student_application_review_without_slot_sync(
    p_application_id, p_round, p_decision, p_note, p_revision
  );
  if p_round = 'interview' then
    select * into slot from public.interview_slots
    where application_id = p_application_id and status = 'booked'
    order by starts_at desc limit 1 for update;
    if found then
      insert into public.interview_assessments(slot_id, application_id, admin_id, note)
      values (slot.id, p_application_id, auth.uid(), btrim(p_note));
    end if;
  end if;
end;
$$;

revoke all on function public.admin_save_student_application_review(uuid, text, text, text, integer)
  from public, anon;
grant execute on function public.admin_save_student_application_review(uuid, text, text, text, integer)
  to authenticated;

alter function public.admin_save_application_assessment(uuid, text)
  rename to admin_save_application_assessment_without_slot_sync;
revoke all on function public.admin_save_application_assessment_without_slot_sync(uuid, text)
  from public, anon, authenticated;

create function public.admin_save_application_assessment(p_application_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
begin
  perform public.admin_save_application_assessment_without_slot_sync(p_application_id, p_note);
  select * into app from public.recruitment_applications where id = p_application_id;
  if app.role = 'teacher' and app.status in ('interview_booked', 'accepted', 'interview_rejected') then
    select * into slot from public.interview_slots
    where application_id = p_application_id and status = 'booked'
    order by starts_at desc limit 1 for update;
    if found then
      insert into public.interview_assessments(slot_id, application_id, admin_id, note)
      values (slot.id, p_application_id, auth.uid(), btrim(p_note));
    end if;
  end if;
end;
$$;

revoke all on function public.admin_save_application_assessment(uuid, text) from public, anon;
grant execute on function public.admin_save_application_assessment(uuid, text) to authenticated;

create function public.clear_interview_slot_notes(p_slot_id uuid, p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare app_role text;
begin
  delete from public.interview_assessments
  where slot_id = p_slot_id and application_id = p_application_id;
  select role into app_role from public.recruitment_applications where id = p_application_id;
  if app_role = 'student' then
    update public.student_application_reviews set note = '', revision = revision + 1, updated_at = now()
    where application_id = p_application_id and round = 'interview' and note <> '';
  end if;
  delete from public.recruitment_feedback
  where application_id = p_application_id and stage = 'interview' and decision = 'note';
end;
$$;

revoke all on function public.clear_interview_slot_notes(uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_cancel_interview_slot(p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare slot public.interview_slots; app_id uuid; note_app_id uuid;
begin
  perform public.require_role('admin');
  select application_id into app_id from public.interview_slots where id = p_slot_id;
  if app_id is not null then
    perform 1 from public.recruitment_applications where id = app_id for update;
  end if;
  select * into slot from public.interview_slots where id = p_slot_id for update;
  if not found then raise exception 'This interview slot no longer exists.'; end if;
  if slot.application_id is distinct from app_id then raise exception 'This slot just changed. Refresh before cancelling.'; end if;
  if slot.status = 'cancelled' then raise exception 'This interview slot is already cancelled.'; end if;

  if slot.application_id is null and slot.last_application_id is null
    and not exists (
      select 1 from public.interview_assessments assessment where assessment.slot_id = slot.id
    ) then
    delete from public.interview_slots where id = slot.id;
    return;
  end if;

  note_app_id := coalesce(slot.application_id, slot.last_application_id);
  if note_app_id is null then
    select application_id into note_app_id from public.interview_assessments
    where slot_id = slot.id order by created_at desc, id desc limit 1;
  end if;
  if note_app_id is not null then perform public.clear_interview_slot_notes(slot.id, note_app_id); end if;

  update public.interview_slots set status = 'cancelled', application_id = null where id = slot.id;
  if slot.application_id is not null then
    update public.recruitment_applications set status = 'interview_invited', updated_at = now()
    where id = slot.application_id and status = 'interview_booked';
  end if;
end;
$$;

create or replace function public.cancel_interview_booking() returns void
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; slot public.interview_slots;
  cutoff integer := public.platform_setting_int('interview_cancel_cutoff_hours');
  contact text;
begin
  if auth.uid() is null then raise exception 'Sign in to change your interview.' using errcode = '42501'; end if;
  select * into app from public.recruitment_applications
  where applicant_id = auth.uid() and status = 'interview_booked' for update;
  if not found then raise exception 'You have no booked interview to change.'; end if;
  select * into slot from public.interview_slots
  where application_id = app.id and status = 'booked' for update;
  if not found then raise exception 'This interview has already started or cannot be changed. Contact ABVN.'; end if;
  if slot.starts_at <= now() then raise exception 'This interview has already started. Contact your interviewer for help.'; end if;
  if slot.starts_at <= now() + make_interval(hours => cutoff) then
    select coalesce(nullif(btrim(admin.email), ''), 'ABVN') into contact
    from public.profiles admin where admin.id = slot.created_by;
    raise exception 'This interview cannot be cancelled within % hours of its start. Contact % for urgent changes.',
      cutoff, coalesce(contact, 'ABVN');
  end if;

  perform public.clear_interview_slot_notes(slot.id, app.id);
  update public.interview_slots set status = 'available', application_id = null where id = slot.id;
  update public.recruitment_applications set status = 'interview_invited', updated_at = now() where id = app.id;
end;
$$;

grant execute on function public.cancel_interview_booking() to authenticated;
grant execute on function public.admin_cancel_interview_slot(uuid) to authenticated;

commit;
