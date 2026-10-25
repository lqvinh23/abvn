import { DateTime } from "luxon";
import type { RecruitmentStatus, Role, StudentApplicationReview, StudentRecruitmentCampaign } from "./types";

export const campaignTimeZone = "Asia/Ho_Chi_Minh";
export const campaignStatuses = ["upcoming", "ongoing", "completed"] as const;
export type CampaignStatus = typeof campaignStatuses[number];
export const campaignStatusLabels: Record<CampaignStatus, string> = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed" };

export function campaignPastDue(campaign: StudentRecruitmentCampaign, now: number) {
  return DateTime.fromMillis(now, { zone: campaignTimeZone }).toISODate()! > campaign.due_on;
}

export function campaignWindowOpen(campaign: StudentRecruitmentCampaign, window: "form" | "interview", now: number) {
  if (campaign.completed_at || campaignPastDue(campaign, now)) return false;
  const today = DateTime.fromMillis(now, { zone: campaignTimeZone }).toISODate()!;
  return today >= campaign[`${window}_opens_on`] && today <= campaign[`${window}_closes_on`];
}

export function campaignStatus(campaign: StudentRecruitmentCampaign, now: number): CampaignStatus {
  if (campaign.completed_at || campaignPastDue(campaign, now)) return "completed";
  const today = DateTime.fromMillis(now, { zone: campaignTimeZone }).toISODate()!;
  if (today < campaign.form_opens_on) return "upcoming";
  return "ongoing";
}

export function campaignSelection(campaigns: StudentRecruitmentCampaign[], selected: string | null) {
  return selected ?? campaigns[0]?.id ?? "";
}

export function applicationBirthDateLabel(dateOfBirth: string | null, now: number) {
  if (!dateOfBirth) return "Not provided";
  const birth = DateTime.fromISO(dateOfBirth, { zone: campaignTimeZone });
  const today = DateTime.fromMillis(now, { zone: campaignTimeZone });
  if (!birth.isValid || !today.isValid) throw new Error("Application birth date could not be displayed.");
  const birthdayPending = today.month < birth.month || (today.month === birth.month && today.day < birth.day);
  const age = today.year - birth.year - Number(birthdayPending);
  return `${birth.toFormat("dd/MM/yyyy")} (${age} years old)`;
}

export function applicationBirthDateSummary(dateOfBirth: string | null, now: number) {
  return applicationBirthDateLabel(dateOfBirth, now).replace(" years old", "");
}

export const recruitmentStatuses: RecruitmentStatus[] = ["submitted", "interview_invited", "interview_booked", "review_rejected", "interview_rejected", "accepted"];

export const recruitmentStatusLabels: Record<RecruitmentStatus, string> = {
  submitted: "Application review",
  interview_invited: "Interview invited",
  interview_booked: "Interview booked",
  review_rejected: "Application failed",
  interview_rejected: "Interview failed",
  accepted: "Accepted",
};

export type StudentApplicationDecision = {
  round: "application" | "interview";
  decision: "pass" | "fail" | "pending" | "unavailable";
};

export function studentApplicationDecision(
  status: RecruitmentStatus,
  reviews: readonly Pick<StudentApplicationReview, "round" | "decision">[],
  reviewsAvailable: boolean,
): StudentApplicationDecision {
  if (status === "review_rejected") return { round: "application", decision: "fail" };
  if (status === "accepted") return { round: "interview", decision: "pass" };
  if (status === "interview_rejected") return { round: "interview", decision: "fail" };
  const round = status === "submitted" ? "application" : "interview";
  if (!reviewsAvailable) return { round, decision: "unavailable" };
  const review = reviews.find(item => item.round === round);
  return { round, decision: review?.decision ?? "pending" };
}

export const recruitmentSteps = ["Application", "Application review", "Interview", "Final review"];
export const studentRecruitmentSteps = [...recruitmentSteps, "ABVN Student"];

export function recruitmentStep(status?: RecruitmentStatus, interviewEnded = false, memberRole?: Role | null) {
  if (memberRole === "student") return 4;
  if (!status) return 0;
  if (status === "submitted" || status === "review_rejected") return 1;
  if (status === "interview_invited" || (status === "interview_booked" && !interviewEnded)) return 2;
  return 3;
}

export function isValidNationalIdLast8(value: string) {
  return value.length === 8 && /^[0-9]{8}$/.test(value);
}

export function recruitmentDocumentExtension(bytes: Uint8Array, mime: string): "pdf" | "doc" | "docx" | null {
  if (mime === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "pdf";
  if (mime === "application/msword" && [208, 207, 17, 224, 161, 177, 26, 225].every((byte, i) => bytes[i] === byte)) return "doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4) return "docx";
  return null;
}
