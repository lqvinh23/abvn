import type { RecruitmentStatus } from "./types";

export const recruitmentStatuses: RecruitmentStatus[] = ["submitted", "interview_invited", "interview_booked", "review_rejected", "interview_rejected", "accepted"];

export const recruitmentStatusLabels: Record<RecruitmentStatus, string> = {
  submitted: "Application review",
  interview_invited: "Choose an interview",
  interview_booked: "Interview booked",
  review_rejected: "Application not selected",
  interview_rejected: "Not selected after interview",
  accepted: "Accepted",
};

export const recruitmentSteps = ["Application", "Application review", "Interview", "Final review"];

export function recruitmentStep(status?: RecruitmentStatus, interviewEnded = false) {
  if (!status) return 0;
  if (status === "submitted" || status === "review_rejected") return 1;
  if (status === "interview_invited" || (status === "interview_booked" && !interviewEnded)) return 2;
  return 3;
}

export function recruitmentDocumentExtension(bytes: Uint8Array, mime: string): "pdf" | "doc" | "docx" | null {
  if (mime === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "pdf";
  if (mime === "application/msword" && [208, 207, 17, 224, 161, 177, 26, 225].every((byte, i) => bytes[i] === byte)) return "doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4) return "docx";
  return null;
}
