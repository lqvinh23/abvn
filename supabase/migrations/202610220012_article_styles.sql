-- Extend article styles without changing existing content or version numbers.
begin;
alter function public.valid_article_node(jsonb,text,integer) rename to valid_article_node_media;
create function public.valid_article_node(node jsonb, parent text default null, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text; attributes jsonb; mark jsonb; marks jsonb := '[]';
begin
  if depth>12 or jsonb_typeof(node) is distinct from 'object' then return false; end if;
  kind := node->>'type';
  attributes := node->'attrs';
  if attributes ? 'align' then
    if kind not in ('paragraph','heading') or jsonb_typeof(attributes->'align') is distinct from 'string'
      or attributes->>'align' not in ('center','right','justify') then return false; end if;
    attributes := attributes - 'align';
    if attributes='{}'::jsonb then node := node - 'attrs';
    else node := jsonb_set(node,'{attrs}',attributes); end if;
  end if;
  if attributes ? 'width' then
    if kind<>'image' or jsonb_typeof(attributes->'width') is distinct from 'number' then return false; end if;
    if attributes->>'width' !~ '^[0-9]{2,3}$' then return false; end if;
    if (attributes->>'width')::integer not between 10 and 100 then return false; end if;
    node := jsonb_set(node,'{attrs}',attributes - 'width');
  end if;
  if kind='text' and node ? 'marks' then
    if jsonb_typeof(node->'marks') is distinct from 'array' then return false; end if;
    if jsonb_array_length(node->'marks')>5 then return false; end if;
    for mark in select value from jsonb_array_elements(node->'marks') loop
      if mark->>'type'='color' then
        if jsonb_typeof(mark) is distinct from 'object' then return false; end if;
        if (select count(*) from jsonb_object_keys(mark))<>2
          or jsonb_typeof(mark->'attrs') is distinct from 'object' then return false; end if;
        if (select count(*) from jsonb_object_keys(mark->'attrs'))<>1
          or jsonb_typeof(mark->'attrs'->'color') is distinct from 'string' then return false; end if;
        if mark->'attrs'->>'color' !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
      else marks := marks || jsonb_build_array(mark);
      end if;
    end loop;
    node := jsonb_set(node,'{marks}',marks);
  end if;
  return public.valid_article_node_media(node,parent,depth);
end;
$$;
revoke execute on function public.valid_article_node(jsonb,text,integer) from public,anon,authenticated;
revoke execute on function public.valid_article_node_media(jsonb,text,integer) from public,anon,authenticated;
commit;
