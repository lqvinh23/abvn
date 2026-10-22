"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export default function SortHeader({ column, children, defaultColumn = "number", defaultDirection = "asc", className = "", local = false }: { column: string; children: ReactNode; defaultColumn?: string; defaultDirection?: "asc" | "desc"; className?: string; local?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const selected = (query.get("sort") || defaultColumn) === column;
  const direction = query.get("direction") === "desc" ? "desc" : query.get("direction") === "asc" ? "asc" : defaultDirection;
  return <th scope="col" aria-sort={selected ? direction === "asc" ? "ascending" : "descending" : "none"} className={`px-3 py-2 font-semibold ${className}`}>
    <button type="button" className="inline-flex min-h-11 items-center gap-2 text-left hover:text-green-900 focus-visible:outline-2 focus-visible:outline-green-800" onClick={() => {
      const params = new URLSearchParams(query);
      params.set("sort", column);
      params.set("direction", selected && direction === "asc" ? "desc" : "asc");
      params.delete("page");
      if (local) window.history.replaceState(null, "", `${pathname}?${params}`);
      else router.replace(`${pathname}?${params}`, { scroll: false });
    }}>{children}{selected ? <span aria-hidden="true" className="text-green-800">{direction === "asc" ? "↑" : "↓"}</span> : null}</button>
  </th>;
}
