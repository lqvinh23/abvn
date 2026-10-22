import type { ContentBody, EditableArticle } from "./schema.ts";

export function sameContent(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((value, index) => sameContent(value, b[index]));
  const left = Object.entries(a);
  const right = Object.entries(b);
  return left.length === right.length && left.every(([key, value]) =>
    Object.hasOwn(b, key) && sameContent(value, (b as Record<string, unknown>)[key]));
}

function articleContent(article?: EditableArticle) {
  if (!article) return article;
  const { publisher_name, ...content } = article;
  void publisher_name;
  return content;
}

export function mergeContentDraft(base: ContentBody, local: ContentBody, remote: ContentBody): ContentBody | null {
  if ("articles" in base && "articles" in local && "articles" in remote) {
    const before = new Map(base.articles.map(article => [article.slug, article]));
    const mine = new Map(local.articles.map(article => [article.slug, article]));
    const theirs = new Map(remote.articles.map(article => [article.slug, article]));
    const articles: EditableArticle[] = [];
    for (const slug of new Set([...theirs.keys(), ...mine.keys(), ...before.keys()])) {
      const original = before.get(slug);
      const current = mine.get(slug);
      const latest = theirs.get(slug);
      const localChanged = !sameContent(articleContent(original), articleContent(current));
      const remoteChanged = !sameContent(articleContent(original), articleContent(latest));
      if (localChanged && remoteChanged && !sameContent(articleContent(current), articleContent(latest))) return null;
      const chosen = localChanged ? current : latest;
      if (chosen) articles.push(latest?.publisher_name ? { ...chosen, publisher_name: latest.publisher_name } : chosen);
    }
    return { articles };
  }
  if ("fields" in base && "fields" in local && "fields" in remote) {
    const fields = { ...remote.fields };
    for (const [key, value] of Object.entries(local.fields)) {
      if (value === base.fields[key]) continue;
      if (remote.fields[key] !== base.fields[key] && remote.fields[key] !== value) return null;
      fields[key] = value;
    }
    const localSectionsChanged = !sameContent(base.sections, local.sections);
    if (localSectionsChanged && !sameContent(base.sections, remote.sections) && !sameContent(local.sections, remote.sections)) return null;
    return { fields, sections: localSectionsChanged ? local.sections : remote.sections };
  }
  return null;
}
