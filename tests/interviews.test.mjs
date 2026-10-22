import assert from "node:assert/strict";
import test from "node:test";
import { matchesInterview } from "../src/lib/platform/interviews.ts";

test("interview search includes interviewer and interviewee names/emails, title and description", () => {
  const slot = { title:"Teacher interview",description:"Speaking assessment",
    interviewer:{name:"Kevin Parker",email:"kevin@example.test"},
    interviewee:{name:"An Nguyen",email:"an@example.test"} };
  for (const query of [" KEVIN ","kevin@","an nguyen","AN@EXAMPLE","teacher","speaking",""]) assert.equal(matchesInterview(slot,query),true,query);
  assert.equal(matchesInterview(slot,"unknown"),false);
  assert.equal(matchesInterview({},"Kevin"),false);
  assert.equal(matchesInterview({applicant_name:"Legacy Applicant",applicant_email:"legacy@example.test"},"legacy@"),true);
});
