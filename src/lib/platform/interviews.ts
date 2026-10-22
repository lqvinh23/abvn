import type { InterviewAssessment, InterviewSlot, RecruitmentRole } from "./types";

export type InterviewPerson = { name: string; email: string; time_zone: string; photo: string | null; href?: string };
export type InterviewCalendarSlot = InterviewSlot & {
  applicant_name?: string; applicant_href?: string; applicant_email?: string;
  interviewer?: InterviewPerson; interviewee?: InterviewPerson;
};
export type InterviewCandidate = { id: string; full_name: string; email: string; role: RecruitmentRole };
export type AssessmentEntry = InterviewAssessment & { author_name: string };

export function matchesInterview(slot: InterviewCalendarSlot, search: string) {
  const query = search.trim().toLowerCase();
  return !query || [slot.title,slot.description,slot.applicant_name,slot.applicant_email,slot.interviewer?.name,slot.interviewer?.email,slot.interviewee?.name,slot.interviewee?.email]
    .some(value => value?.toLowerCase().includes(query));
}
