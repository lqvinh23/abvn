begin;

alter table public.recruitment_feedback drop constraint recruitment_feedback_decision_check;
alter table public.recruitment_feedback add constraint recruitment_feedback_decision_check
  check (decision in ('invite', 'reject', 'accept', 'note'));

create function public.admin_save_application_assessment(p_application_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  perform 1 from public.recruitment_applications where id = p_application_id for update;
  if not found then raise exception 'Choose an existing application.'; end if;
  if p_note is null or btrim(p_note) !~ '[^[:space:]]' or char_length(btrim(p_note)) > 4000 then
    raise exception 'Enter an assessment note between 1 and 4000 characters.';
  end if;
  insert into public.recruitment_feedback(application_id, admin_id, stage, decision, note)
  values (p_application_id, auth.uid(), 'review', 'note', btrim(p_note));
end;
$$;

revoke all on function public.admin_save_application_assessment(uuid, text) from public, anon;
grant execute on function public.admin_save_application_assessment(uuid, text) to authenticated;

create or replace function public.recruitment_workflow_version() returns integer
language sql immutable set search_path = '' as $$ select 35; $$;

commit;
