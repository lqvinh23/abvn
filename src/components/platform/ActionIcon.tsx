import type { SVGProps } from "react";

const paths = {
  plus: "M12 5v14M5 12h14",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8",
  publish: "M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  image: "M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M8 7h.01",
  video: "M3 5h18v14H3V5Zm7 4 5 3-5 3V9Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  edit: "m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  undo: "M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12",
  redo: "m15 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12",
  close: "m6 6 12 12M6 18 18 6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0 0c2.5-2.7 3.7-6 3.7-10S14.5 4.7 12 2m0 20c-2.5-2.7-3.7-6-3.7-10S9.5 4.7 12 2M2 12h20",
  logout: "M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6",
} as const;

export default function ActionIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg {...props} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${props.className ?? ""}`}><path d={paths[name]} /></svg>;
}
