export const contentPages = [
  { id: "home", label: "Landing page" },
  { id: "about", label: "About page" },
  { id: "news", label: "News" },
  { id: "media", label: "Media" },
] as const;

export function getContentPage(value: string | null) {
  return contentPages.find(page => page.id === value)?.id ?? "home";
}

type EditorGroup = { label: string; fields: { id: string; label: string }[] };
function fields(prefix: string, entries: [number, string][]) {
  return entries.map(([number, label]) => ({ id: `${prefix}-${String(number).padStart(3, "0")}`, label }));
}
function members(numbers: number[], firstLabel: string) {
  return numbers.flatMap((number, index) => fields("about", [[number, index === 0 ? `${firstLabel} name` : `Member ${index} name`], [number + 1, index === 0 ? `${firstLabel} photo` : `Member ${index} photo`]]));
}

export const editorGroups: Record<"home" | "about", EditorGroup[]> = {
  home: [
    { label: "Welcome", fields: fields("home", [[99, "Main headline"], [100, "Headline second line"], [101, "Introduction"], [108, "Main image"], [109, "Image description"]]) },
    { label: "Impact figures", fields: fields("home", [[1, "Years of operation"], [3, "Students taught"], [5, "Volunteer teachers"], [7, "One-to-one lessons"]]) },
    { label: "Purpose", fields: fields("home", [[114, "Purpose headline"], [115, "Purpose description"]]) },
    { label: "Partners", fields: [9, 12, 15, 18, 21].flatMap((number, index) => fields("home", [[number, `Partner ${index + 1} name`], [number + 2, `Partner ${index + 1} logo`]])) },
    { label: "Join us", fields: fields("home", [[135, "Invitation headline"], [136, "Invitation description"]]) },
  ],
  about: [
    { label: "Introduction", fields: fields("about", [[52, "Main headline"], [53, "Headline second line"], [54, "Introduction"], [63, "Main image"], [64, "Image description"]]) },
    { label: "Our story", fields: fields("about", [[66, "Story headline"], [67, "Opening paragraph"], [68, "Our beginnings"], [69, "Our purpose"], [70, "Story image"], [71, "Image description"]]) },
    { label: "Mission & programme", fields: fields("about", [[73, "Mission headline"], [74, "Mission description"], [76, "Mission goal 1"], [78, "Mission goal 2"], [80, "Mission goal 3"], [108, "Programme headline"], [109, "Programme introduction"], [111, "For learners"], [115, "For volunteer teachers"]]) },
    { label: "Founder", fields: fields("about", [[87, "Founder name"], [89, "Founder biography"], [90, "Founder photo"]]) },
    { label: "Founding teachers", fields: members([11, 13, 15], "Teacher 1") },
    { label: "Education Affairs team", fields: [...fields("about", [[18, "Team description"]]), ...members([19, 21, 23, 25, 27], "Team leader")] },
    { label: "Human Resources team", fields: [...fields("about", [[30, "Team description"]]), ...members([31, 33, 35, 37], "Team leader")] },
    { label: "Communication & Outreach team", fields: [...fields("about", [[40, "Team description"]]), ...members([41, 43, 45, 47, 49], "Team leader")] },
  ],
};
import type { EditableArticle } from "./schema.ts";

export function sortedArticleRows(articles: EditableArticle[], newestFirst = true) {
  return articles.map((article, index) => ({ article, index })).sort((a, b) =>
    (newestFirst ? b.article.date.localeCompare(a.article.date) : a.article.date.localeCompare(b.article.date)) || a.index - b.index);
}

export type ArticleFilters = { query: string; category: string; date: string; dateTo?: string; visibility: string };

export function filteredArticleRows(articles: EditableArticle[], filters: ArticleFilters, newestFirst = true) {
  const query = filters.query.trim().toLocaleLowerCase();
  return sortedArticleRows(articles, newestFirst).filter(({ article }) =>
    (!query || `${article.title} ${article.publisher_name ?? ""}`.toLocaleLowerCase().includes(query))
    && (!filters.category || article.category === filters.category)
    && (!filters.date || (filters.dateTo ? article.date >= filters.date && article.date <= filters.dateTo : article.date === filters.date))
    && (!filters.visibility || article.status === filters.visibility));
}
