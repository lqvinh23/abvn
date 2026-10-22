-- Keep the structured article validator aligned with the standard editor.
-- This replaces validation only: no content or version numbers are changed.
begin;
create or replace function public.valid_article_node(node jsonb, parent text default null, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text; child jsonb; mark jsonb; attributes jsonb;
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
  elsif kind not in ('paragraph','heading','bulletList','orderedList','blockquote','horizontalRule') then
    return false;
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
commit;
