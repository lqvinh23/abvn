begin;

create function public.my_interview_available_contacts()
returns table(slot_id uuid, contact_name text, contact_email text, contact_time_zone text)
language sql stable security definer set search_path = '' as $$
  select slot.id,
    coalesce(nullif(btrim(admin.full_name), ''), 'ABVN admin'),
    coalesce(nullif(btrim(admin.email), ''), 'abettervnproject@gmail.com'),
    coalesce(admin.time_zone, 'Asia/Ho_Chi_Minh')
  from public.interview_slots slot
  left join public.profiles admin on admin.id = slot.created_by
  where auth.uid() is not null
    and slot.status = 'available'
    and slot.starts_at > now()
    and exists (
      select 1
      from public.recruitment_applications applicant
      where applicant.applicant_id = auth.uid()
        and applicant.status = 'interview_invited'
    )
  order by slot.starts_at, slot.id;
$$;

revoke all on function public.my_interview_available_contacts() from public, anon;
grant execute on function public.my_interview_available_contacts() to authenticated;

commit;
