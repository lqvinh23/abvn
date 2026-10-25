"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { DateTime } from "luxon";
import { resetPlatformSettings, runPolicyReview, savePlatformSettings } from "@/src/app/dashboard/actions";
import { formatSettingValue, settingGroups, settingLabels, type PlatformSettingsReport, type SettingField } from "@/src/lib/platform/settings";
import ActionForm from "./ActionForm";
import ActionIcon from "./ActionIcon";
import { Field, Select, TextArea } from "./Fields";
import TimeZoneSelect from "./TimeZoneSelect";

function SettingInput({ field, value, customized }: { field: SettingField; value: string | number | boolean; customized: boolean }) {
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;
  const help = <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{field.help}{customized ? <strong className="font-semibold text-green-800"> Customized.</strong> : null}</span>;
  if (field.kind === "boolean") {
    return <label className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm sm:col-span-2 xl:col-span-3">
      <input type="checkbox" name={field.key} value="true" defaultChecked={value === true} className="mt-1 size-5 shrink-0 accent-green-700" />
      <span><span className="font-medium text-slate-800">{field.label}</span>{help}</span>
    </label>;
  }
  const wide = field.wide ? "sm:col-span-2 xl:col-span-3" : "";
  return <div className={wide}>
    {field.kind === "timezone" ? <TimeZoneSelect label={field.label} name={field.key} defaultValue={String(value)} />
      : field.kind === "choice" ? <Select compact label={field.label} name={field.key} defaultValue={String(value)}>{field.options!.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
      : field.kind === "integer" ? <Field compact label={label} name={field.key} type="number" inputMode="numeric" min={field.min} max={field.max} step={1} defaultValue={Number(value)} required />
      : field.kind === "time" ? <Field compact label={field.label} name={field.key} type="time" defaultValue={String(value)} required />
      : field.kind === "email" ? <Field compact label={field.label} name={field.key} type="email" maxLength={field.maxLength} defaultValue={String(value)} />
      : <Field compact label={field.label} name={field.key} type="text" maxLength={field.maxLength} defaultValue={String(value)} />}
    <p className="mt-1 text-xs leading-5 text-slate-500">{field.help}{customized ? <strong className="font-semibold text-green-800"> Customized.</strong> : null}</p>
  </div>;
}

export default function PlatformSettings({ report, timeZone }: { report: PlatformSettingsReport; timeZone: string }) {
  const [state, formAction, pending] = useActionState(savePlatformSettings, { ok: false, message: "" });
  const saved = JSON.stringify(report.values);
  const customized = new Set(report.customized);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return <div className="workspace-stack">
    <nav aria-label="Settings actions" className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <p className="min-w-0 flex-1 px-2 text-sm text-slate-600">Changes apply immediately to booking, cancellation, status and eligibility rules.</p>
        <button type="submit" form="platform-settings-form" disabled={pending} className="button-primary inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><ActionIcon name="save" />{pending ? "Saving..." : "Save settings"}</button>
      </nav>
      {state.message ? <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-rose-50 text-rose-900"}`}>{state.message}</p> : null}
      <div className="workspace-panel-scroll space-y-3">
        <form id="platform-settings-form" onSubmit={submit} aria-label="Programme settings">
        <fieldset key={saved} disabled={pending} className="min-w-0 space-y-3">
          {settingGroups.map(group => <section key={group.id} aria-labelledby={`settings-${group.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id={`settings-${group.id}`} className="text-base font-semibold text-slate-900">{group.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{group.description}</p>
            <div className={`mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2 ${group.twoColumns ? "" : "xl:grid-cols-3"}`}>
              {group.fields.map(field => <SettingInput key={field.key} field={field} value={report.values[field.key]} customized={customized.has(field.key)} />)}
            </div>
          </section>)}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <TextArea compact label="Change note (optional, saved with the history)" name="note" rows={2} maxLength={500} />
          </section>
        </fieldset>
        </form>
        <section aria-labelledby="settings-maintenance" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="settings-maintenance" className="text-base font-semibold text-slate-900">Maintenance</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Inactivation and the end of timed suspensions are reviewed automatically each hour where the database supports scheduled jobs, and whenever a student opens the dashboard or books. Run the review now to apply them immediately.</p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <ActionForm action={runPolicyReview} submitLabel="Run policy review" icon="switch" iconAndText />
            <ActionForm action={resetPlatformSettings} submitLabel="Reset to defaults" icon="undo" iconAndText submitButtonClassName="button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50" beforeSubmit={() => window.confirm("Reset every programme rule to its default value? The change is recorded in the history.")} />
          </div>
        </section>

        <section aria-labelledby="settings-history" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="settings-history" className="text-base font-semibold text-slate-900">Recent changes</h2>
          {report.history.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Recent programme settings changes</caption>
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="py-2 pr-3">Setting</th><th scope="col" className="py-2 pr-3">Change</th><th scope="col" className="py-2 pr-3">By</th><th scope="col" className="py-2">When</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {report.history.map((item, index) => <tr key={`${item.changed_at}-${item.key}-${index}`}>
                <th scope="row" className="py-2 pr-3 font-medium text-slate-800">{settingLabels[item.key] ?? item.key}{item.note ? <span className="block text-xs font-normal text-slate-500">{item.note}</span> : null}</th>
                <td className="py-2 pr-3 text-slate-700">{formatSettingValue(item.key, item.old_value)} <span aria-label="changed to">→</span> {formatSettingValue(item.key, item.new_value)}</td>
                <td className="py-2 pr-3 text-slate-600">{item.changed_by ?? "-"}</td>
                <td className="py-2 whitespace-nowrap text-slate-600">{DateTime.fromISO(item.changed_at, { zone: timeZone }).toFormat("dd/MM/yyyy HH:mm")}</td>
              </tr>)}
            </tbody>
          </table></div> : <p className="mt-2 text-sm text-slate-500">No changes yet. Every rule is using its default.</p>}
        </section>
      </div>
    </div>;
}
