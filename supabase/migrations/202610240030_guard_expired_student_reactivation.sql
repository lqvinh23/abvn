begin;

create function public.prevent_expired_student_reactivation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student'
    and old.participation_status is distinct from 'active'
    and new.participation_status = 'active'
    and new.study_expires_on < (now() at time zone public.platform_setting_text('rule_time_zone'))::date
    and coalesce(current_setting('abvn.policy_action', true), '') <> 'on' then
    raise exception 'Extend the study expiry date before restoring Active status.';
  end if;
  return new;
end;
$$;

create trigger prevent_expired_student_reactivation
before update of participation_status, study_expires_on on public.profiles
for each row execute function public.prevent_expired_student_reactivation();

commit;
