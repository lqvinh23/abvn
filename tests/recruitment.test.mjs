import assert from "node:assert/strict";
import test from "node:test";
import { applicationBirthDateLabel, applicationBirthDateSummary, campaignPastDue, campaignSelection, campaignStatus, campaignWindowOpen, isValidNationalIdLast8, recruitmentDocumentExtension, recruitmentStep, recruitmentStatusLabels, recruitmentSteps, studentApplicationDecision, studentRecruitmentSteps } from "../src/lib/platform/recruitment.ts";

const campaign = {
  id: "current", name: "2027 Jan", form_opens_on: "2026-11-01", form_closes_on: "2026-12-31",
  interview_opens_on: "2026-12-01", interview_closes_on: "2027-01-10",
  due_on: "2027-01-20", completed_at: null,
};

test("application info formats DOB and current age at the Vietnam birthday boundary", () => {
  assert.equal(applicationBirthDateLabel("2000-01-01", Date.parse("2025-12-31T16:59:59Z")), "01/01/2000 (25 years old)");
  assert.equal(applicationBirthDateLabel("2000-01-01", Date.parse("2025-12-31T17:00:00Z")), "01/01/2000 (26 years old)");
  assert.equal(applicationBirthDateLabel("2004-02-29", Date.parse("2026-02-28T12:00:00Z")), "29/02/2004 (21 years old)");
  assert.equal(applicationBirthDateLabel("2004-02-29", Date.parse("2026-02-28T17:00:00Z")), "29/02/2004 (22 years old)");
  assert.equal(applicationBirthDateLabel("2004-02-29", Date.parse("2028-02-28T17:00:00Z")), "29/02/2004 (24 years old)");
  assert.equal(applicationBirthDateSummary("2007-02-08", Date.parse("2026-10-25T00:00:00Z")), "08/02/2007 (19)");
  assert.equal(applicationBirthDateSummary(null, Date.parse("2026-10-25T00:00:00Z")), "Not provided");
  assert.equal(applicationBirthDateLabel(null, Date.parse("2026-10-25T00:00:00Z")), "Not provided");
  assert.throws(() => applicationBirthDateLabel("invalid", Date.parse("2026-10-25T00:00:00Z")), /birth date could not be displayed/);
});

test("campaign dates include both boundary days in Vietnam time", () => {
  assert.equal(campaignWindowOpen(campaign, "form", Date.parse("2026-10-31T16:59:59Z")), false);
  assert.equal(campaignWindowOpen(campaign, "form", Date.parse("2026-10-31T17:00:00Z")), true);
  assert.equal(campaignWindowOpen(campaign, "form", Date.parse("2026-12-31T16:59:59Z")), true);
  assert.equal(campaignWindowOpen(campaign, "form", Date.parse("2026-12-31T17:00:00Z")), false);
  assert.equal(campaignWindowOpen(campaign, "interview", Date.parse("2026-11-30T17:00:00Z")), true);
  assert.equal(campaignWindowOpen(campaign, "interview", Date.parse("2027-01-10T17:00:00Z")), false);
});

test("campaign statuses cover upcoming, ongoing between rounds, and completed", () => {
  assert.equal(campaignStatus(campaign, Date.parse("2026-10-31T16:59:59Z")), "upcoming");
  assert.equal(campaignStatus(campaign, Date.parse("2026-10-31T17:00:00Z")), "ongoing");
  assert.equal(campaignStatus(campaign, Date.parse("2027-01-01T12:00:00Z")), "ongoing");
  assert.equal(campaignStatus(campaign, Date.parse("2027-01-10T16:59:59Z")), "ongoing");
  assert.equal(campaignStatus(campaign, Date.parse("2027-01-10T17:00:00Z")), "ongoing");
  assert.equal(campaignStatus(campaign, Date.parse("2027-01-20T16:59:59Z")), "ongoing");
  assert.equal(campaignStatus(campaign, Date.parse("2027-01-20T17:00:00Z")), "completed");
});

test("the due date is inclusive and closes otherwise-open windows only after Vietnam midnight", () => {
  const earlyDue = { ...campaign, due_on: "2026-12-15" };
  const beforeMidnight = Date.parse("2026-12-15T16:59:59Z");
  const afterMidnight = Date.parse("2026-12-15T17:00:00Z");
  assert.equal(campaignPastDue(earlyDue, beforeMidnight), false);
  assert.equal(campaignStatus(earlyDue, beforeMidnight), "ongoing");
  assert.equal(campaignPastDue(earlyDue, afterMidnight), true);
  assert.equal(campaignStatus(earlyDue, afterMidnight), "completed");
  for (const window of ["form", "interview"]) {
    assert.equal(campaignWindowOpen(earlyDue, window, beforeMidnight), true);
    assert.equal(campaignWindowOpen(earlyDue, window, afterMidnight), false);
  }
  const reopened = { ...earlyDue, completed_at: null };
  assert.equal(campaignStatus(reopened, beforeMidnight), "ongoing");
  assert.equal(campaignStatus(reopened, afterMidnight), "completed");
  assert.equal(campaignStatus({ ...campaign, due_on: "2026-10-20" }, Date.parse("2026-10-25T00:00:00Z")), "completed");
});

test("manual completion overrides all dates and closes both campaign windows", () => {
  const completed = { ...campaign, completed_at: "2026-10-20T00:00:00Z" };
  for (const now of ["2026-10-25T00:00:00Z", "2026-12-15T00:00:00Z", "2027-01-20T00:00:00Z"]) {
    assert.equal(campaignStatus(completed, Date.parse(now)), "completed");
    assert.equal(campaignWindowOpen(completed, "form", Date.parse(now)), false);
    assert.equal(campaignWindowOpen(completed, "interview", Date.parse(now)), false);
  }
});

test("application campaign filter defaults to latest and respects explicit All and Unassigned", () => {
  assert.equal(campaignSelection([campaign], null), "current");
  assert.equal(campaignSelection([campaign], ""), "");
  assert.equal(campaignSelection([campaign], "unassigned"), "unassigned");
  assert.equal(campaignSelection([], null), "");
});

test("student application decisions follow the active review round and completed outcomes", () => {
  assert.deepEqual(studentApplicationDecision("submitted", [{ round: "application", decision: "pass" }], true), { round: "application", decision: "pass" });
  assert.deepEqual(studentApplicationDecision("submitted", [{ round: "application", decision: null }], true), { round: "application", decision: "pending" });
  assert.deepEqual(studentApplicationDecision("interview_booked", [{ round: "application", decision: "pass" }, { round: "interview", decision: "fail" }], true), { round: "interview", decision: "fail" });
  assert.deepEqual(studentApplicationDecision("interview_invited", [], false), { round: "interview", decision: "unavailable" });
  assert.deepEqual(studentApplicationDecision("review_rejected", [], false), { round: "application", decision: "fail" });
  assert.deepEqual(studentApplicationDecision("accepted", [], false), { round: "interview", decision: "pass" });
  assert.deepEqual(studentApplicationDecision("interview_rejected", [], false), { round: "interview", decision: "fail" });
});

test("recruitment roadmap follows the four confirmed steps, including completed interviews", () => {
  assert.deepEqual(recruitmentSteps, ["Application", "Application review", "Interview", "Final review"]);
  assert.equal(recruitmentStep(), 0);
  assert.equal(recruitmentStep("submitted"), 1);
  assert.equal(recruitmentStep("review_rejected"), 1);
  assert.equal(recruitmentStep("interview_invited"), 2);
  assert.equal(recruitmentStep("interview_booked", false), 2);
  assert.equal(recruitmentStep("interview_booked", true), 3);
  assert.equal(recruitmentStep("interview_rejected"), 3);
  assert.equal(recruitmentStep("accepted"), 3);
  assert.deepEqual(recruitmentStatusLabels, {
    submitted: "Application review",
    interview_invited: "Interview invited",
    interview_booked: "Interview booked",
    review_rejected: "Application failed",
    interview_rejected: "Interview failed",
    accepted: "Accepted",
  });
});

test("student membership activates the fifth step, even without a recruitment application", () => {
  assert.deepEqual(studentRecruitmentSteps, ["Application", "Application review", "Interview", "Final review", "ABVN Student"]);
  assert.equal(recruitmentStep(undefined, false, "student"), 4);
  for (const status of Object.keys(recruitmentStatusLabels)) {
    assert.equal(recruitmentStep(status, false, "student"), 4);
  }
  assert.equal(recruitmentStep("accepted", true, null), 3);
  assert.equal(recruitmentStep("accepted", true, "teacher"), 3);
  assert.equal(recruitmentStep("accepted", true, "admin"), 3);
});

test("student identity requires exactly eight ASCII digits and preserves leading zeros", () => {
  for (const value of ["00123456", "12345678"]) assert.equal(isValidNationalIdLast8(value), true);
  for (const value of ["", "1234567", "123456789", "1234abcd", "1234 567", "１２３４５６７８", "12345678\n", " 12345678"])
    assert.equal(isValidNationalIdLast8(value), false, JSON.stringify(value));
});

test("recruitment document validation checks MIME and signature, not the filename", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7");
  const doc = Uint8Array.from([208, 207, 17, 224, 161, 177, 26, 225]);
  const docx = Uint8Array.from([80, 75, 3, 4]);
  const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  assert.equal(recruitmentDocumentExtension(pdf, "application/pdf"), "pdf");
  assert.equal(recruitmentDocumentExtension(doc, "application/msword"), "doc");
  assert.equal(recruitmentDocumentExtension(docx, docxMime), "docx");
  assert.equal(recruitmentDocumentExtension(pdf, "text/html"), null);
  assert.equal(recruitmentDocumentExtension(new TextEncoder().encode("<script>"), "application/pdf"), null);
  assert.equal(recruitmentDocumentExtension(new Uint8Array(), "application/pdf"), null);
  assert.equal(recruitmentDocumentExtension(docx.slice(0, 3), docxMime), null);
  assert.equal(recruitmentDocumentExtension(pdf, docxMime), null);
});
