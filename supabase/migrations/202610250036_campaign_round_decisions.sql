begin;

create table public.student_application_reviews (
  application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  round text not null check (round in ('application', 'interview')),
  decision text check (decision in ('pass', 'fail')),
  note text not null check (char_length(note) <= 4000),
  admin_id uuid not null references public.profiles(id),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  primary key (application_id, round)
);
alter table public.student_application_reviews enable row level security;
revoke all on public.student_application_reviews from anon, authenticated;
grant select on public.student_application_reviews to authenticated;
create policy student_application_reviews_admin_read on public.student_application_reviews
  for select to authenticated using (public.is_admin());

insert into public.student_application_reviews(application_id, round, decision, note, admin_id, updated_at, published_at)
select distinct on (f.application_id, f.stage) f.application_id,
  case when f.stage = 'review' then 'application' else 'interview' end,
  case when decided.decision in ('invite', 'accept') then 'pass' when decided.decision = 'reject' then 'fail' end,
  f.note, f.admin_id, f.created_at, decided.created_at
from public.recruitment_feedback f join public.recruitment_applications a on a.id = f.application_id
left join lateral (
  select d.decision, d.created_at from public.recruitment_feedback d
  where d.application_id = f.application_id and d.stage = f.stage and d.decision <> 'note'
  order by d.created_at desc, d.id desc limit 1
) decided on true
where a.role = 'student'
order by f.application_id, f.stage, f.created_at desc, f.id desc;

create function public.admin_save_student_application_review(
  p_application_id uuid, p_round text, p_decision text, p_note text, p_revision integer
) returns void language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; review public.student_application_reviews;
begin
  perform public.require_role('admin');
  select * into app from public.recruitment_applications where id = p_application_id for update;
  if not found or app.role <> 'student' then raise exception 'Choose an existing student application.'; end if;
  if p_round is null or p_round not in ('application', 'interview') then raise exception 'Choose an application or interview round.'; end if;
  if p_decision is not null and p_decision not in ('pass', 'fail') then raise exception 'Choose Pass, Fail, or no decision.'; end if;
  if p_note is null or p_note !~ '[^[:space:]]' or char_length(p_note) > 4000 then
    raise exception 'Enter a review note between 1 and 4000 characters.';
  end if;
  select * into review from public.student_application_reviews where application_id = p_application_id and round = p_round;
  if p_revision is null or p_revision <> coalesce(review.revision, 0) then
    raise exception 'This review changed. Refresh before saving to avoid overwriting another admin.';
  end if;
  if review.published_at is not null and p_decision is distinct from review.decision then
    raise exception 'This decision has already been published. Only its note can be updated.';
  end if;
  if review.published_at is null and p_decision is not null and
    ((p_round = 'application' and app.status <> 'submitted')
      or (p_round = 'interview' and app.status not in ('interview_invited', 'interview_booked'))) then
    raise exception 'This application is no longer awaiting a decision for this round.';
  end if;
  insert into public.student_application_reviews(application_id, round, decision, note, admin_id, revision)
  values (p_application_id, p_round, p_decision, btrim(p_note), auth.uid(), coalesce(review.revision, 0) + 1)
  on conflict (application_id, round) do update set decision = excluded.decision, note = excluded.note,
    admin_id = excluded.admin_id, revision = excluded.revision, updated_at = now();
end;
$$;

alter function public.admin_review_application(uuid, text, text) rename to review_application_before_campaign_publish;
alter function public.admin_record_interview_result(uuid, text, text) rename to record_interview_before_campaign_publish;
revoke all on function public.review_application_before_campaign_publish(uuid, text, text),
  public.record_interview_before_campaign_publish(uuid, text, text) from public, anon, authenticated;

create function public.admin_review_application(p_application_id uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if exists (select 1 from public.recruitment_applications where id = p_application_id and role = 'student') then
    raise exception 'Save the review decision, then publish the application round from Campaigns.';
  end if;
  perform public.review_application_before_campaign_publish(p_application_id, p_decision, p_note);
end;
$$;
create function public.admin_record_interview_result(p_application_id uuid, p_decision text, p_feedback text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if exists (select 1 from public.recruitment_applications where id = p_application_id and role = 'student') then
    raise exception 'Save the review decision, then publish the interview round from Campaigns.';
  end if;
  perform public.record_interview_before_campaign_publish(p_application_id, p_decision, p_feedback);
end;
$$;

alter function public.admin_assign_member_role(uuid, public.account_role) rename to assign_member_role_before_campaign_publish;
revoke all on function public.assign_member_role_before_campaign_publish(uuid, public.account_role)
  from public, anon, authenticated;
create function public.admin_assign_member_role(p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_role = 'student' and exists (
    select 1 from public.recruitment_applications where applicant_id = p_user_id and role = 'student'
      and status in ('submitted', 'interview_invited', 'interview_booked')
  ) then
    raise exception 'This applicant is in student recruitment. Publish their interview decision from Campaigns instead.';
  end if;
  perform public.assign_member_role_before_campaign_publish(p_user_id, p_role);
end;
$$;

create function public.admin_publish_student_campaign_round(p_campaign_id uuid, p_round text)
returns integer language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; review public.student_application_reviews; processed integer := 0;
begin
  perform public.require_role('admin');
  if p_round is null or p_round not in ('application', 'interview') then raise exception 'Choose an application or interview round.'; end if;
  perform 1 from public.student_recruitment_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found.'; end if;
  for app in select a.* from public.recruitment_applications a
    where a.campaign_id = p_campaign_id and a.role = 'student'
      and ((p_round = 'application' and a.status = 'submitted')
        or (p_round = 'interview' and a.status = 'interview_booked'))
    order by a.id for update
  loop
    select * into review from public.student_application_reviews
      where application_id = app.id and round = p_round;
    if not found or review.decision is null or review.published_at is not null then continue; end if;
    if p_round = 'application' then
      perform public.review_application_before_campaign_publish(app.id,
        case when review.decision = 'pass' then 'invite' else 'reject' end, review.note);
    else
      perform public.record_interview_before_campaign_publish(app.id,
        case when review.decision = 'pass' then 'accept' else 'reject' end, review.note);
    end if;
    update public.student_application_reviews set published_at = now(), revision = revision + 1
      where application_id = app.id and round = p_round;
    processed := processed + 1;
  end loop;
  if processed = 0 then raise exception 'No unpublished decisions are ready for this round. Save Pass / Fail reviews first; interview decisions also require a booked interview.'; end if;
  return processed;
end;
$$;

revoke all on function public.admin_save_student_application_review(uuid, text, text, text, integer),
  public.admin_publish_student_campaign_round(uuid, text), public.admin_review_application(uuid, text, text),
  public.admin_record_interview_result(uuid, text, text), public.admin_assign_member_role(uuid, public.account_role) from public, anon;
grant execute on function public.admin_save_student_application_review(uuid, text, text, text, integer),
  public.admin_publish_student_campaign_round(uuid, text), public.admin_review_application(uuid, text, text),
  public.admin_record_interview_result(uuid, text, text), public.admin_assign_member_role(uuid, public.account_role) to authenticated;

create or replace function public.recruitment_workflow_version() returns integer
language sql immutable set search_path = '' as $$ select 36; $$;

commit;
