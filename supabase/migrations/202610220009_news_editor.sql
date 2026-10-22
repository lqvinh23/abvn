-- Rich article content and authoritative per-article publisher attribution.
begin;

create function public.valid_article_node(node jsonb, parent text default null, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text; child jsonb; mark jsonb; key text;
begin
  if depth > 12 or jsonb_typeof(node) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(node) k where k not in ('type','content','text','attrs','marks')) then return false; end if;
  kind := node->>'type';
  if kind is null or not (case
    when parent is null then kind='doc'
    when parent in ('paragraph','heading') then kind in ('text','hardBreak')
    when parent in ('bulletList','orderedList') then kind='listItem'
    else kind in ('paragraph','heading','bulletList','orderedList','blockquote','horizontalRule')
  end) then return false; end if;
  if kind='text' then
    if jsonb_typeof(node->'text') is distinct from 'string' or length(node->>'text') not between 1 and 10000
      or node ? 'content' or node ? 'attrs' then return false; end if;
    if node ? 'marks' then
      if jsonb_typeof(node->'marks') is distinct from 'array' then return false; end if;
      if jsonb_array_length(node->'marks')>3 then return false; end if;
      for mark in select value from jsonb_array_elements(node->'marks') loop
        if jsonb_typeof(mark) is distinct from 'object' then return false; end if;
        if (select count(*) from jsonb_object_keys(mark))<>1 or coalesce(mark->>'type','') not in ('bold','italic','strike') then return false; end if;
      end loop;
    end if;
    return true;
  end if;
  if node ? 'text' or node ? 'marks' then return false; end if;
  if node ? 'attrs' then
    if jsonb_typeof(node->'attrs') is distinct from 'object' then return false; end if;
    key := case when kind='heading' then 'level' when kind='orderedList' then 'start' end;
    if key is null then return false; end if;
    if exists(select 1 from jsonb_object_keys(node->'attrs') k where k<>key and not (kind='orderedList' and k='type' and node->'attrs'->'type'='null'::jsonb))
      or jsonb_typeof(node->'attrs'->key) is distinct from 'number'
      or (node->'attrs'->>key) !~ '^[0-9]{1,5}$' then return false; end if;
    if key='level' and (node->'attrs'->>key)::integer not in (2,3) then return false; end if;
    if key='start' and (node->'attrs'->>key)::integer not between 1 and 10000 then return false; end if;
  elsif kind='heading' then return false;
  end if;
  if kind in ('hardBreak','horizontalRule') then return not node ? 'content'; end if;
  if not node ? 'content' then return kind='paragraph'; end if;
  if jsonb_typeof(node->'content') is distinct from 'array' then return false; end if;
  if jsonb_array_length(node->'content')>200 or (kind not in ('paragraph','heading') and jsonb_array_length(node->'content')=0) then return false; end if;
  for child in select value from jsonb_array_elements(node->'content') loop
    if not public.valid_article_node(child,kind,depth+1) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke execute on function public.valid_article_node(jsonb,text,integer) from public,anon,authenticated;

-- Backfill only when a real administrator published an identical article.
update public.content_documents d set published=jsonb_build_object('articles',(
  select coalesce(jsonb_agg(case when publisher.name is not null then a || jsonb_build_object('publisher_name',publisher.name) else a end),'[]')
  from jsonb_array_elements(d.published->'articles') a
  left join lateral (
    select r.publisher_name as name from public.content_revisions r
    where r.key='news' and r.publisher_id is not null and exists (
      select 1 from jsonb_array_elements(r.body->'articles') historic where historic - 'publisher_name'=a - 'publisher_name')
    order by r.id desc limit 1
  ) publisher on true
)) where d.key='news';

-- Preserve private draft work as Archived; saving a collection is still a private draft.
update public.content_documents d set
  draft=jsonb_build_object('articles',(
    select coalesce(jsonb_agg((case when a->>'status'='draft' then jsonb_set(a,'{status}','"archived"') else a end)
      || case when published_article ? 'publisher_name' then jsonb_build_object('publisher_name',published_article->>'publisher_name') else '{}'::jsonb end),'[]')
    from jsonb_array_elements(d.draft->'articles') a
    left join lateral (select p as published_article from jsonb_array_elements(d.published->'articles') p where p->>'slug'=a->>'slug') p on true
  )),
  published=jsonb_build_object('articles',(select coalesce(jsonb_agg(case when a->>'status'='draft' then jsonb_set(a,'{status}','"archived"') else a end),'[]') from jsonb_array_elements(d.published->'articles') a)),
  version=version+1
where key='news';
update public.content_revisions r set body=jsonb_build_object('articles',(
  select coalesce(jsonb_agg(case when a->>'status'='draft' then jsonb_set(a,'{status}','"archived"') else a end),'[]')
  from jsonb_array_elements(r.body->'articles') a)) where key='news';

alter function public.validate_web_content(text,jsonb) rename to validate_web_content_base;
create function public.validate_web_content(p_key text,p_body jsonb)
returns void language plpgsql set search_path = '' as $$
declare article jsonb;
begin
  perform public.validate_web_content_base(p_key,p_body);
  if p_key='news' then
    for article in select value from jsonb_array_elements(p_body->'articles') loop
      if article->>'status' not in ('published','archived') then raise exception 'Choose Published or Archived.'; end if;
      if article ? 'richText' and not public.valid_article_node(article->'richText') then raise exception 'The article contains unsupported formatting.'; end if;
    end loop;
  end if;
end;
$$;
revoke execute on function public.validate_web_content(text,jsonb) from public,anon,authenticated;

create or replace function public.admin_write_content(p_key text,p_body jsonb,p_version integer,p_publish boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare current_version integer; next_version integer; previous jsonb; article jsonb; prior jsonb;
  articles jsonb := '[]'; publisher text;
begin
  if not public.is_admin() then raise exception 'An approved admin account is required.' using errcode='42501'; end if;
  select version,published into current_version,previous from public.content_documents where key=p_key for update;
  if current_version is null or p_version is distinct from current_version then
    raise exception 'Another admin changed this content. Reload before saving to avoid overwriting their work.';
  end if;
  perform public.validate_web_content(p_key,p_body);
  if p_key='news' then
    select full_name into publisher from public.profiles where id=auth.uid();
    for article in select value from jsonb_array_elements(p_body->'articles') loop
      select a into prior from jsonb_array_elements(previous->'articles') a where a->>'slug'=article->>'slug';
      article := article - 'publisher_name';
      if p_publish and article->>'status'='published' and
        (prior is null or article is distinct from prior - 'publisher_name' or not prior ? 'publisher_name') then
        article := article || jsonb_build_object('publisher_name',publisher);
      elsif prior ? 'publisher_name' then
        article := article || jsonb_build_object('publisher_name',prior->>'publisher_name');
      end if;
      articles := articles || jsonb_build_array(article);
    end loop;
    p_body := jsonb_build_object('articles',articles);
  end if;
  next_version := current_version+1;
  update public.content_documents set draft=p_body,version=next_version,
    published=case when p_publish then p_body else published end,
    published_at=case when p_publish then now() else published_at end where key=p_key;
  if p_publish then
    insert into public.content_revisions(key,body,publisher_name,publisher_id)
      select p_key,p_body,full_name,id from public.profiles where id=auth.uid();
  end if;
  return next_version;
end;
$$;
create function public.admin_write_news(p_body jsonb,p_version integer,p_publish boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare next_version integer; saved jsonb;
begin
  next_version := public.admin_write_content('news',p_body,p_version,p_publish);
  select draft into saved from public.content_documents where key='news';
  return jsonb_build_object('version',next_version,'body',saved);
end;
$$;
revoke execute on function public.admin_write_news(jsonb,integer,boolean) from public,anon;
grant execute on function public.admin_write_news(jsonb,integer,boolean) to authenticated;
commit;
