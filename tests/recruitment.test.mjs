import assert from "node:assert/strict";
import test from "node:test";
import { recruitmentDocumentExtension, recruitmentStep, recruitmentStatusLabels, recruitmentSteps } from "../src/lib/platform/recruitment.ts";

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
  assert.equal(Object.keys(recruitmentStatusLabels).length, 6);
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
