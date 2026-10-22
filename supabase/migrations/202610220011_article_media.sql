-- Extend safe article formatting and private media access without changing saved content.
begin;
create or replace function public.valid_article_node(node jsonb, parent text default null, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text; child jsonb; mark jsonb; attributes jsonb; source text;
begin
  if depth > 12 or jsonb_typeof(node) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(node) as names(name)
    where name not in ('type','content','text','attrs','marks')) then return false; end if;
  kind := node->>'type';
  if kind is null then return false; end if;
  if parent is null then
    if kind<>'doc' then return false; end if;
  elsif parent in ('paragraph','heading') then
    if kind not in ('text','hardBreak') then return false; end if;
  elsif parent in ('bulletList','orderedList') then
    if kind<>'listItem' then return false; end if;
  elsif kind not in ('paragraph','heading','bulletList','orderedList','blockquote','horizontalRule','image','youtube') then
    return false;
  end if;
  if kind in ('image','youtube') then
    if node ? 'text' or node ? 'marks' or node ? 'content'
      or jsonb_typeof(node->'attrs') is distinct from 'object' then return false; end if;
    attributes := node->'attrs';
    if (select count(*) from jsonb_object_keys(attributes))<>1
      or jsonb_typeof(attributes->'src') is distinct from 'string' then return false; end if;
    source := attributes->>'src';
    if kind='image' then
      return source ~ '^/images/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|svg)$'
        or source ~ '^/api/content-media/[0-9a-f-]{36}\.(png|jpg|webp)$';
    end if;
    return source ~ '^https://www\.youtube-nocookie\.com/embed/[a-zA-Z0-9_-]{11}$';
  end if;
  if kind='text' then
    if jsonb_typeof(node->'text') is distinct from 'string'
      or length(node->>'text') not between 1 and 10000
      or node ? 'content' or node ? 'attrs' then return false; end if;
    if node ? 'marks' then
      if jsonb_typeof(node->'marks') is distinct from 'array' then return false; end if;
      if jsonb_array_length(node->'marks')>4 then return false; end if;
      for mark in select value from jsonb_array_elements(node->'marks') loop
        if jsonb_typeof(mark) is distinct from 'object' then return false; end if;
        if (select count(*) from jsonb_object_keys(mark))<>1
          or coalesce(mark->>'type','') not in ('bold','italic','underline','strike') then return false; end if;
      end loop;
    end if;
    return true;
  end if;
  if node ? 'text' or node ? 'marks' then return false; end if;
  if node ? 'attrs' then
    attributes := node->'attrs';
    if jsonb_typeof(attributes) is distinct from 'object' then return false; end if;
    if kind='heading' then
      if exists(select 1 from jsonb_object_keys(attributes) as names(name) where name<>'level')
        or attributes->'level' not in ('2'::jsonb,'3'::jsonb)
        or not attributes ? 'level' then return false; end if;
    elsif kind='orderedList' then
      if exists(select 1 from jsonb_object_keys(attributes) as names(name) where name not in ('start','type'))
        or (attributes ? 'type' and attributes->'type'<>'null'::jsonb)
        or jsonb_typeof(attributes->'start') is distinct from 'number' then return false; end if;
      if (attributes->>'start') !~ '^[0-9]{1,5}$' then return false; end if;
      if (attributes->>'start')::integer not between 1 and 10000 then return false; end if;
    else return false;
    end if;
  elsif kind='heading' then return false;
  end if;
  if kind in ('hardBreak','horizontalRule') then return not (node ? 'content'); end if;
  if not (node ? 'content') then return kind='paragraph'; end if;
  if jsonb_typeof(node->'content') is distinct from 'array' then return false; end if;
  if jsonb_array_length(node->'content')>200
    or (kind not in ('paragraph','heading') and jsonb_array_length(node->'content')=0) then return false; end if;
  for child in select value from jsonb_array_elements(node->'content') loop
    if not public.valid_article_node(child,kind,depth+1) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke execute on function public.valid_article_node(jsonb,text,integer) from public,anon,authenticated;

alter function public.validate_web_content(text,jsonb) rename to validate_web_content_text;
create function public.validate_web_content(p_key text,p_body jsonb)
returns void language plpgsql set search_path = '' as $$
declare image jsonb;
begin
  perform public.validate_web_content_text(p_key,p_body);
  if p_key='news' then
    for image in select * from jsonb_path_query(p_body,'$.articles[*].richText.** ? (@.type == "image")') loop
      if image->'attrs'->>'src' like '/api/content-media/%'
        and not exists(select 1 from storage.objects where bucket_id='web-content'
          and name=substring(image->'attrs'->>'src' from 20)) then
        raise exception 'An uploaded article image is missing. Upload it again before saving.';
      end if;
    end loop;
  end if;
end;
$$;
revoke execute on function public.validate_web_content(text,jsonb) from public,anon,authenticated;

create or replace function public.can_read_content_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.content_documents d where
    (d.key <> 'news' and exists(select 1 from jsonb_each_text(d.published->'fields') f where f.value='/api/content-media/'||p_name))
    or (d.key='news' and exists(select 1 from jsonb_array_elements(d.published->'articles') a
      where a->>'status'='published' and (a->>'image'='/api/content-media/'||p_name
        or jsonb_path_exists(a,'$.richText.** ? (@.type == "image" && @.attrs.src == $path)',
          jsonb_build_object('path','/api/content-media/'||p_name)))))
  );
$$;
revoke execute on function public.can_read_content_media(text) from public;
grant execute on function public.can_read_content_media(text) to anon,authenticated;
commit;
