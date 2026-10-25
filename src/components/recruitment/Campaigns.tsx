import Link from "next/link";
import type { StudentCampaignReport, StudentRecruitmentCampaign } from "@/src/lib/platform/types";
import { campaignPastDue, campaignStatus, campaignStatusLabels } from "@/src/lib/platform/recruitment";
import { manageStudentCampaign, publishStudentCampaignRound, saveStudentCampaign } from "@/src/app/recruitment/actions";
import ActionForm from "../platform/ActionForm";
import ActionIcon from "../platform/ActionIcon";
import EditorDialog from "../platform/EditorDialog";
import { Field } from "../platform/Fields";
import PaginatedTable from "../platform/PaginatedTable";
import { ColumnChart, PieChart } from "../platform/StatisticsCharts";

const base = "/dashboard/admin?view=students&section=recruitment&tab=campaigns";
const panel = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

function CampaignStatusTag({ campaign, now }: { campaign: StudentRecruitmentCampaign; now: number }) {
  const status = campaignStatus(campaign, now);
  const tag = { upcoming: "bg-blue-50 text-blue-800", ongoing: "bg-green-50 text-green-800", completed: "bg-slate-100 text-slate-600" }[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tag}`}>{campaignStatusLabels[status]}</span>;
}

function CampaignEditor({ campaign, now }: { campaign?: StudentRecruitmentCampaign; now: number }) {
  const pastDue = campaign && campaignPastDue(campaign, now);
  return <div className="space-y-5"><ActionForm action={saveStudentCampaign} submitLabel="Save campaign" icon="save" iconAndText preserveOnError>
    <input type="hidden" name="campaign_id" value={campaign?.id ?? ""} />
    <Field compact label="Campaign name" name="name" defaultValue={campaign?.name ?? ""} placeholder="2027 Jan" maxLength={100} required />
    <p className="text-sm leading-6 text-slate-600">All dates include the whole day in Vietnam time. Applications normally open in November-December for January, or May-June for July. Application windows cannot overlap.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field compact label="Form open date" name="form_opens_on" type="date" defaultValue={campaign?.form_opens_on} required />
      <Field compact label="Form close date" name="form_closes_on" type="date" defaultValue={campaign?.form_closes_on} required />
      <Field compact label="Interview booking open date" name="interview_opens_on" type="date" defaultValue={campaign?.interview_opens_on} required />
      <Field compact label="Interview booking close date" name="interview_closes_on" type="date" defaultValue={campaign?.interview_closes_on} required />
      <Field compact label="Due date" name="due_on" type="date" defaultValue={campaign?.due_on} required />
    </div>
    <p className="text-xs leading-5 text-slate-500">The campaign completes after its due date, even if a form or interview window is still scheduled to be open.</p>
    <p className="text-xs leading-5 text-slate-500">Changes apply immediately to new submissions and bookings. Existing applications and booked interviews are retained.</p>
    {campaign?.completed_at ? <p className="text-sm text-slate-600">This campaign was marked completed. Use Mark campaign incomplete to restore its scheduled windows while the due date has not passed.</p> : null}
  </ActionForm>
    {campaign && !pastDue ? <ActionForm action={manageStudentCampaign} icon={campaign.completed_at ? "undo" : "publish"} iconAndText submitLabel={campaign.completed_at ? "Mark campaign incomplete" : "Mark campaign completed"} className="border-t border-slate-200 pt-5">
      <input type="hidden" name="campaign_id" value={campaign.id} />
      <input type="hidden" name="operation" value={campaign.completed_at ? "incomplete" : "complete"} />
      <p className="text-sm leading-6 text-slate-600">{campaign.completed_at ? "Remove manual completion. Applications and new interview bookings will follow their scheduled windows again." : "Immediately close new applications and interview bookings for this campaign. You can mark it incomplete again until its due date has passed."} Scheduled dates, submitted applications and existing bookings are retained.</p>
    </ActionForm> : null}
    {pastDue ? <p className="border-t border-slate-200 pt-5 text-sm text-slate-600">The due date has passed. Extend and save the due date before marking this campaign incomplete.</p> : null}
  </div>;
}

export function CampaignToolbar({ selected, now }: { selected?: StudentRecruitmentCampaign; now: number }) {
  return selected ? <Link href={base} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ActionIcon name="left" />Back to campaigns</Link>
    : <EditorDialog title="Add campaign" icon="plus" showLabel><CampaignEditor now={now} /></EditorDialog>;
}

export default function Campaigns({ campaigns, now, selected, report }: {
  campaigns: StudentRecruitmentCampaign[]; now: number; selected?: StudentRecruitmentCampaign; report?: StudentCampaignReport;
}) {
  if (selected && report) {
    const metrics = [{ key: "students", label: "Accepted students", color: "var(--primary)" }];
    const agePoints = report.age.map(item => ({ label: item.label, values: { students: item.count } }));
    const areas = ["North", "North Central", "South Central", "South", "Unknown"];
    const areaPoints = areas.map(label => ({ label, values: { students: report.area.find(item => item.label === label)?.count ?? 0 } }));
    const genders = ["Male", "Female", "Other", "Unknown"];
    return <div className="workspace-panel-scroll space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{selected.name} recruitment report</h2><div className="mt-1"><CampaignStatusTag campaign={selected} now={now} /></div></div><EditorDialog title="Edit campaign" label={`Edit ${selected.name}`}><CampaignEditor campaign={selected} now={now} /></EditorDialog></div>
      <section className={panel}><dl className="grid gap-5 sm:grid-cols-3">
        {[["Application round", report.applications], ["Interview round", report.invited], ["New students", report.accepted]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString("en-US")}</dd></div>)}
      </dl><p className="mt-4 text-xs leading-5 text-slate-500">All submitted applications → invited applicants → accepted students. Charts below describe accepted students only. Age is measured on the campaign&apos;s form opening date. Unrecognized cities and missing demographic data appear as Unknown.</p></section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className={panel}><h3 className="mb-4 font-semibold">Number of students by gender</h3><PieChart title="Accepted students by gender" emptyLabel="No students" slices={genders.map((label, index) => ({ label, value: report.gender.find(item => item.label === label)?.count ?? 0, color: ["#15803d", "#eab308", "#6366f1", "#94a3b8"][index] }))} /></section>
        <section className={panel}><h3 className="mb-4 font-semibold">Number of students by age</h3>{agePoints.length ? <ColumnChart title="Accepted students by age" compact showValues points={agePoints} metrics={metrics} /> : <p className="text-sm text-slate-500">No accepted students yet.</p>}</section>
        <section className={`${panel} xl:col-span-2`}><h3 className="mb-4 font-semibold">Number of students by area</h3><ColumnChart title="Accepted students by area" showValues points={areaPoints} metrics={metrics} /></section>
      </div>
    </div>;
  }
  return <div className="workspace-stack">
    <PaginatedTable caption="Student recruitment campaigns" columns={5} emptyMessage="No campaigns yet. Add a campaign to open student recruitment." headers={<tr>{["Name / Status", "Form open / close", "Interview booking open / close", "Due date", "Actions"].map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr>}>
      {campaigns.map(campaign => <tr key={campaign.id}><th scope="row" className="font-semibold">{campaign.name}<div className="mt-1"><CampaignStatusTag campaign={campaign} now={now} /></div></th><td>{dateLabel(campaign.form_opens_on)}<br />{dateLabel(campaign.form_closes_on)}</td><td>{dateLabel(campaign.interview_opens_on)}<br />{dateLabel(campaign.interview_closes_on)}</td><td>{dateLabel(campaign.due_on)}</td><td><div className="flex gap-2"><EditorDialog title="Edit campaign" label={`Edit ${campaign.name}`}><CampaignEditor campaign={campaign} now={now} /></EditorDialog><Link href={`${base}&campaign_report=${campaign.id}`} className="workspace-icon-action" title={`View ${campaign.name}`} aria-label={`View ${campaign.name}`}><ActionIcon name="eye" /></Link><EditorDialog title="Delete campaign" label={`Delete ${campaign.name}`} icon="trash"><ActionForm action={manageStudentCampaign} submitLabel="Delete campaign" icon="trash" iconAndText>
          <input type="hidden" name="campaign_id" value={campaign.id} />
          <input type="hidden" name="operation" value="delete" />
          <p className="text-sm leading-6">Delete &quot;{campaign.name}&quot; permanently? Campaigns with linked applications cannot be deleted.</p>
        </ActionForm></EditorDialog>{(["application", "interview"] as const).map(round => <EditorDialog key={round} title={`Publish ${round} round`} label={`Publish ${round} round for ${campaign.name}`} icon={round === "application" ? "publish" : "video"}>
          <ActionForm action={publishStudentCampaignRound} submitLabel={`Publish ${round} round`} icon="publish" iconAndText preserveOnError>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <input type="hidden" name="round" value={round} />
            <p className="text-sm leading-6">Publish saved {round} decisions for &quot;{campaign.name}&quot;? {round === "application" ? "Pass invites applicants to interview; Fail rejects their applications." : "Pass activates student accounts; Fail rejects applicants after interview. Booked interviews must have ended."} Applicants without a decision and previously published decisions are not changed. You may publish again after reviewing more applicants.</p>
          </ActionForm>
        </EditorDialog>)}</div></td></tr>)}
    </PaginatedTable>
  </div>;
}
