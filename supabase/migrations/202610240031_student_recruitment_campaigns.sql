begin;

create table public.student_recruitment_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 100),
  form_opens_on date not null,
  form_closes_on date not null,
  interview_opens_on date not null,
  interview_closes_on date not null,
  created_at timestamptz not null default now(),
  check (form_closes_on >= form_opens_on),
  check (interview_closes_on >= interview_opens_on and interview_opens_on >= form_opens_on),
  exclude using gist (daterange(form_opens_on, form_closes_on, '[]') with &&)
);
alter table public.student_recruitment_campaigns enable row level security;
revoke all on public.student_recruitment_campaigns from anon, authenticated;
grant select on public.student_recruitment_campaigns to anon, authenticated;
create policy student_campaigns_read on public.student_recruitment_campaigns
for select to anon, authenticated using (true);

alter table public.recruitment_applications
  add column campaign_id uuid references public.student_recruitment_campaigns(id),
  add column gender text check (gender in ('male', 'female', 'other')),
  add constraint student_campaign_only check (campaign_id is null or role = 'student');
create index recruitment_applications_campaign on public.recruitment_applications(campaign_id, created_at);

create function public.admin_save_student_campaign(
  p_id uuid, p_name text, p_form_opens_on date, p_form_closes_on date,
  p_interview_opens_on date, p_interview_closes_on date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  perform public.require_role('admin');
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    raise exception 'Enter a campaign name (up to 100 characters).';
  end if;
  if p_form_opens_on is null or p_form_closes_on is null or p_interview_opens_on is null
    or p_interview_closes_on is null or p_form_closes_on < p_form_opens_on
    or p_interview_closes_on < p_interview_opens_on or p_interview_opens_on < p_form_opens_on then
    raise exception 'Check the campaign dates. Closing dates cannot precede opening dates, and interviews cannot open before applications.';
  end if;
  if p_id is null then
    insert into public.student_recruitment_campaigns(name, form_opens_on, form_closes_on, interview_opens_on, interview_closes_on)
    values (btrim(p_name), p_form_opens_on, p_form_closes_on, p_interview_opens_on, p_interview_closes_on)
    returning id into saved_id;
  else
    update public.student_recruitment_campaigns set name = btrim(p_name),
      form_opens_on = p_form_opens_on, form_closes_on = p_form_closes_on,
      interview_opens_on = p_interview_opens_on, interview_closes_on = p_interview_closes_on
    where id = p_id returning id into saved_id;
    if not found then raise exception 'This campaign no longer exists. Refresh and try again.'; end if;
  end if;
  return saved_id;
exception
  when exclusion_violation then raise exception 'Application dates overlap another campaign. Choose a separate application window.';
  when unique_violation then raise exception 'A campaign with this name already exists.';
end;
$$;

create function public.assign_student_application_campaign() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.campaign_id is distinct from old.campaign_id then
      raise exception 'An application must remain linked to its original campaign.';
    end if;
  elsif new.role = 'student' then
    select c.id into new.campaign_id from public.student_recruitment_campaigns c
    where (now() at time zone 'Asia/Ho_Chi_Minh')::date between c.form_opens_on and c.form_closes_on
    for share;
    if new.campaign_id is null then
      raise exception 'Student applications are closed. Please return during an open recruitment campaign.';
    end if;
  end if;
  return new;
end;
$$;
create trigger assign_student_application_campaign before insert or update of campaign_id
on public.recruitment_applications for each row execute function public.assign_student_application_campaign();

-- Keep the established application validation and account locking in one place.
alter function public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text)
rename to submit_recruitment_application_before_campaigns;
revoke all on function public.submit_recruitment_application_before_campaigns(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text)
from public, anon, authenticated;

create function public.submit_recruitment_application(
  p_role text, p_full_name text, p_country text, p_time_zone text, p_phone text,
  p_date_of_birth date, p_intro text, p_weekly_hours integer, p_intro_video_url text,
  p_cv_path text, p_photo_path text, p_answers jsonb,
  p_city text default '', p_address text default '', p_occupation text default '', p_organization text default '',
  p_proficiency text default '', p_goals text default '', p_hobbies text default '', p_gender text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare application_id uuid;
begin
  if p_role = 'student' and (p_gender is null or p_gender not in ('male', 'female', 'other')) then
    raise exception 'Choose your gender: Male, Female, or Other.';
  end if;
  application_id := public.submit_recruitment_application_before_campaigns(
    p_role, p_full_name, p_country, p_time_zone, p_phone, p_date_of_birth, p_intro, p_weekly_hours,
    p_intro_video_url, p_cv_path, p_photo_path, p_answers, p_city, p_address, p_occupation,
    p_organization, p_proficiency, p_goals, p_hobbies);
  if p_role = 'student' then
    update public.recruitment_applications set gender = p_gender where id = application_id;
  end if;
  return application_id;
end;
$$;

create function public.guard_student_interview_campaign() returns trigger
language plpgsql security definer set search_path = '' as $$
declare app public.recruitment_applications; campaign public.student_recruitment_campaigns;
begin
  if new.status <> 'booked' or new.application_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'booked' and old.application_id = new.application_id then return new; end if;
  select * into app from public.recruitment_applications where id = new.application_id;
  if app.role = 'student' then
    select * into campaign from public.student_recruitment_campaigns where id = app.campaign_id for share;
    if not found or (now() at time zone 'Asia/Ho_Chi_Minh')::date
      not between campaign.interview_opens_on and campaign.interview_closes_on then
      raise exception 'Interview booking is closed for this student recruitment campaign. Contact ABVN for assistance.';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_student_interview_campaign before insert or update of status, application_id
on public.interview_slots for each row execute function public.guard_student_interview_campaign();

create function public.student_recruitment_area(p_city text) returns text
language sql immutable set search_path = '' as $$
  with normalized as (
    select regexp_replace(regexp_replace(translate(lower(btrim(coalesce(p_city, ''))),
      'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
      '^(thành phố|tinh|thanh pho|tp[.]?|province|city)[[:space:]]+', ''), '[^a-z0-9]', '', 'g') as city
  ), cities as (
    select regexp_replace(city, '(province|city)$', '') as city from normalized
  )
  select case
    when city in ('hanoi','hanoicity','hanoiprovince','haiphong','quangninh','bacninh','bacgiang','haiduong',
      'hungyen','thaibinh','hanam','namdinh','ninhbinh','vinhphuc','phutho','thainguyen','backan','tuyenquang',
      'hagiang','caobang','langson','laocai','yenbai','laichau','dienbien','sonla','hoabinh') then 'North'
    when city in ('thanhhoa','nghean','hatinh','quangbinh','quangtri','thuathienhue','hue') then 'North Central'
    when city in ('danang','quangnam','quangngai','binhdinh','phuyen','khanhhoa','ninhthuan','binhthuan',
      'kontum','gialai','daklak','daclak','daknong','lamdong','dalat','buonmathuot') then 'South Central'
    when city in ('hochiminh','hochiminhcity','hcm','hcmc','saigon','baria','bariavungtau','binhduong',
      'binhphuoc','dongnai','tayninh','longan','tiengiang','bentre','travinh','vinhlong','dongthap',
      'angiang','kiengiang','cantho','haugiang','soctrang','baclieu','camau','vungtau') then 'South'
    else 'Unknown' end from cities;
$$;

create function public.admin_student_campaign_report(p_campaign_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare campaign public.student_recruitment_campaigns; report jsonb;
begin
  perform public.require_role('admin');
  select * into campaign from public.student_recruitment_campaigns where id = p_campaign_id;
  if not found then raise exception 'This campaign no longer exists.'; end if;
  with applications as (
    select a.*, public.student_recruitment_area(a.city) as area,
      extract(year from age(campaign.form_opens_on, a.date_of_birth))::integer as age_years
    from public.recruitment_applications a where a.campaign_id = p_campaign_id and a.role = 'student'
  ), accepted as (select * from applications where status = 'accepted')
  select jsonb_build_object(
    'applications', (select count(*) from applications),
    'invited', (select count(*) from applications a where status in ('interview_invited','interview_booked','interview_rejected','accepted')
      or exists (select 1 from public.recruitment_feedback f where f.application_id = a.id and f.stage = 'review' and f.decision = 'invite')),
    'accepted', (select count(*) from accepted),
    'gender', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by label)
      from (select coalesce(initcap(gender), 'Unknown') as label, count(*) as n from accepted group by gender) g), '[]'::jsonb),
    'age', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by age_years nulls last)
      from (select age_years, coalesce(age_years::text, 'Unknown') as label, count(*) as n from accepted group by age_years) a), '[]'::jsonb),
    'area', coalesce((select jsonb_agg(jsonb_build_object('label', area, 'count', n) order by area)
      from (select area, count(*) as n from accepted group by area) a), '[]'::jsonb)
  ) into report;
  return report;
end;
$$;

revoke all on function public.admin_save_student_campaign(uuid, text, date, date, date, date),
  public.assign_student_application_campaign(), public.guard_student_interview_campaign(),
  public.admin_student_campaign_report(uuid),
  public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.admin_save_student_campaign(uuid, text, date, date, date, date),
  public.admin_student_campaign_report(uuid),
  public.submit_recruitment_application(text, text, text, text, text, date, text, integer, text, text, text, jsonb, text, text, text, text, text, text, text, text)
to authenticated;

commit;
