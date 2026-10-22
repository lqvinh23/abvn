import { Fragment, type ReactNode } from "react";

export default function ContentSections({ order, sections }: { order: string[]; sections: Record<string, ReactNode> }) {
  return order.map(id => <Fragment key={id}>{sections[id]}</Fragment>);
}
