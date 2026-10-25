import type { SettingValues } from "@/src/lib/platform/settings";
import { memberRuleSections } from "@/src/lib/platform/rules-text";

export default function ProgrammeRules({ values, role }: { values: SettingValues; role: "student" | "teacher" }) {
  const sections = memberRuleSections(values, role);
  return <section aria-labelledby="programme-rules" className="max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
    <h2 id="programme-rules" className="text-base font-semibold text-slate-900">Programme rules</h2>
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      {sections.map(section => <div key={section.title}>
        <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
        <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-600">{section.items.map(item => <li key={item}>{item}</li>)}</ul>
      </div>)}
    </div>
  </section>;
}
