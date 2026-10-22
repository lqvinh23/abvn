begin;

create table public.recruitment_form_fields (
  role public.account_role not null check (role in ('teacher', 'student')),
  field_key text not null check (field_key in ('full_name','email','phone','country','time_zone','date_of_birth','weekly_hours','intro','photo','cv','intro_video_url')),
  label text not null check (char_length(btrim(label)) between 1 and 300),
  help_text text not null default '' check (char_length(help_text) <= 500),
  required boolean not null,
  active boolean not null default true,
  deleted boolean not null default false,
  position integer not null check (position between 0 and 1000),
  primary key (role, field_key),
  check (not (field_key in ('full_name','email','phone','country','time_zone','weekly_hours','intro')
    or (role = 'student' and field_key = 'date_of_birth')
    or (role = 'teacher' and field_key in ('photo','cv'))) or (required and active and not deleted))
);
insert into public.recruitment_form_fields(role, field_key, label, required, position)
select r::public.account_role, k, l,
  k in ('full_name','email','phone','country','time_zone','weekly_hours','intro')
    or (r = 'student' and k = 'date_of_birth') or (r = 'teacher' and k in ('photo','cv')), n
from (values ('teacher'),('student')) roles(r)
cross join (values ('full_name','Full name',0),('email','Account email',1),('phone','Phone number',2),
  ('country','Country',3),('time_zone','Time zone',4),('date_of_birth','Date of birth',5),
  ('weekly_hours','Hours per week',6),('intro','Personal introduction',7),('photo','Profile picture',8),
  ('cv','CV / supporting document',9),('intro_video_url','Introduction video',10)) fields(k,l,n);

alter table public.recruitment_form_fields enable row level security;
revoke all on public.recruitment_form_fields from anon, authenticated;
grant select on public.recruitment_form_fields to authenticated;
create policy recruitment_form_fields_read on public.recruitment_form_fields for select to authenticated using (true);

create function public.admin_save_application_field(p_role text, p_key text, p_label text, p_help text,
  p_required boolean, p_position integer, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  update public.recruitment_form_fields set label = btrim(p_label), help_text = btrim(coalesce(p_help,'')),
    required = p_required, position = p_position, active = p_active
  where role::text = p_role and field_key = p_key and not deleted;
  if not found then raise exception 'This field no longer exists.'; end if;
end;
$$;

create function public.admin_manage_application_question(p_role text, p_id text, p_builtin boolean, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_role('admin');
  if p_action is null or p_action not in ('hide','unhide','delete') then raise exception 'Choose a valid question action.'; end if;
  if p_builtin then
    update public.recruitment_form_fields set active = p_action = 'unhide', deleted = p_action = 'delete'
    where role::text = p_role and field_key = p_id and not deleted;
  elsif p_action = 'delete' then
    delete from public.recruitment_questions where id = p_id::uuid and role::text = p_role;
  else
    update public.recruitment_questions set active = p_action = 'unhide', updated_at = now()
    where id = p_id::uuid and role::text = p_role;
  end if;
  if not found then raise exception 'This question no longer exists.'; end if;
end;
$$;

-- Enforce optional field configuration even for submissions outside the web form.
create function public.validate_application_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f record; v text;
begin
  for f in select * from public.recruitment_form_fields where role = new.role loop
    v := case f.field_key when 'photo' then new.photo_path when 'cv' then new.cv_path
      else to_jsonb(new)->>f.field_key end;
    if f.required and f.active and not f.deleted and nullif(btrim(v),'') is null then
      raise exception 'Please provide: %', f.label;
    end if;
    if (not f.active or f.deleted) and nullif(btrim(v),'') is not null then
      raise exception 'The application form changed. Refresh before submitting.';
    end if;
  end loop;
  return new;
end;
$$;
create trigger validate_application_fields before insert on public.recruitment_applications
for each row execute function public.validate_application_fields();

create table public.profile_application_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null, date_of_birth date, weekly_hours integer not null,
  intro_video_url text, answers jsonb not null, application_id uuid not null references public.recruitment_applications(id)
);
alter table public.profile_application_details enable row level security;
revoke all on public.profile_application_details from anon, authenticated;
grant select on public.profile_application_details to authenticated;
create policy profile_application_details_read on public.profile_application_details for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create function public.sync_accepted_application_details() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.profile_application_details(profile_id, phone, date_of_birth, weekly_hours, intro_video_url, answers, application_id)
    values (new.applicant_id,new.phone,new.date_of_birth,new.weekly_hours,new.intro_video_url,new.answers,new.id)
    on conflict (profile_id) do update set phone=excluded.phone, date_of_birth=excluded.date_of_birth,
      weekly_hours=excluded.weekly_hours, intro_video_url=excluded.intro_video_url,
      answers=excluded.answers, application_id=excluded.application_id;
  end if;
  return new;
end;
$$;
create trigger sync_accepted_application_details after update of status on public.recruitment_applications
for each row execute function public.sync_accepted_application_details();

insert into public.profile_application_details(profile_id,phone,date_of_birth,weekly_hours,intro_video_url,answers,application_id)
select distinct on (applicant_id) applicant_id,phone,date_of_birth,weekly_hours,intro_video_url,answers,id
from public.recruitment_applications where status='accepted' order by applicant_id,decided_at desc nulls last,created_at desc;

revoke all on function public.admin_save_application_field(text,text,text,text,boolean,integer,boolean),
  public.admin_manage_application_question(text,text,boolean,text),
  public.validate_application_fields(), public.sync_accepted_application_details() from public, anon, authenticated;
grant execute on function public.admin_save_application_field(text,text,text,text,boolean,integer,boolean),
  public.admin_manage_application_question(text,text,boolean,text) to authenticated;
commit;
