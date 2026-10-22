import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const ids = {
  admin: "00000000-0000-4000-8000-0000000000a1",
  teacherApplicant: "00000000-0000-4000-8000-0000000000a2",
  studentApplicant: "00000000-0000-4000-8000-0000000000a3",
  studentYoung: "00000000-0000-4000-8000-0000000000a4",
  studentOld: "00000000-0000-4000-8000-0000000000a5",
  guest: "00000000-0000-4000-8000-0000000000a6",
};

const MIGRATIONS = [
  "202610200001_learning_platform.sql",
  "202610210001_dashboard_calendar.sql",
  "202610210002_schedule_preferences.sql",
  "202610210003_member_management.sql",
  "202610220013_recruitment.sql",
  "202610220014_recruitment_workflow.sql",
];

const SUBMIT = `select public.submit_recruitment_application($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11,$12::jsonb) as id`;

function yearsAgo(years) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

test("PostgreSQL integration: recruitment applications, interviews, and account sync", async (t) => {
  const db = new PGlite({ extensions: { btree_gist } });
  t.after(() => db.close());
  // Only Supabase-owned auth/storage primitives are stubbed.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$select string_to_array(name, '/')$$;
    grant usage on schema storage to authenticated;
    grant select, insert, delete on storage.objects to authenticated;
  `);
  for (const file of MIGRATIONS) {
    if (file === "202610220014_recruitment_workflow.sql") {
      await db.exec(`insert into auth.users(id,email) values ('00000000-0000-4000-8000-0000000000b1','legacy@example.test');
        insert into public.recruitment_applications(applicant_id,role,full_name,email,time_zone,intro,weekly_hours,cv_path)
        values ('00000000-0000-4000-8000-0000000000b1','teacher','Legacy','legacy@example.test','UTC','Legacy application before photos were required',2,'legacy/cv.pdf')`);
    }
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  assert.equal((await db.query("select photo_path from public.recruitment_applications where full_name='Legacy'")).rows[0].photo_path, null);
  await db.exec(`update public.recruitment_applications set status='review_rejected' where full_name='Legacy';
    delete from auth.users where id='00000000-0000-4000-8000-0000000000b1'`);
  assert.equal(Number((await db.query("select count(*) from public.recruitment_questions")).rows[0].count), 13);
  await db.exec("update public.recruitment_questions set active = false");
  for (const [name, id] of Object.entries(ids)) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,'{}')", [id, `${name}@example.test`]);
  }
  await db.exec(`update public.profiles set role = 'admin', status = 'approved', full_name = 'Admin' where id = '${ids.admin}'`);

  async function asUser(name, query, params = []) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [ids[name] ?? ""]);
    await db.exec("set role authenticated");
    return db.query(query, params);
  }
  async function superQuery(query, params = []) {
    await db.exec("reset role");
    return db.query(query, params);
  }
  async function upload(name, file) {
    const path = `${ids[name]}/${file}`;
    await asUser(name, "insert into storage.objects(bucket_id,name) values ('recruitment-documents',$1)", [path]);
    return path;
  }
  function teacherParams(cv, answers) {
    return ["teacher", "Teacher Applicant", "Vietnam", "Asia/Ho_Chi_Minh", "+84 900 000 000", null,
      "I teach patient English conversation.", 6, "https://www.youtube.com/watch?v=intro", cv, `${ids.teacherApplicant}/photo.jpg`, JSON.stringify(answers)];
  }
  function studentParams(cv, answers, dateOfBirth) {
    return ["student", "Student Applicant", "Vietnam", "Asia/Ho_Chi_Minh", "+84 900 000 001", dateOfBirth,
      "I want to practise English every week.", 3, null, cv, null, JSON.stringify(answers)];
  }
  await assert.rejects(asUser("guest", "select public.request_membership('student')"), /recruitment page/);
  await superQuery("update public.profiles set requested_role = 'teacher' where id=$1", [ids.teacherApplicant]);
  await assert.rejects(asUser("admin", "select public.review_member($1,'approved')", [ids.teacherApplicant]), /complete recruitment/);

  // Admin-managed form questions.
  const teacherQuestion = (await asUser("admin",
    "select public.admin_save_recruitment_question(null,'teacher',$1,$2,'long_text',null,true,1,true) as id",
    ["Why do you want to teach with ABVN?", "Share your motivation."])).rows[0].id;
  const studentQuestion = (await asUser("admin",
    "select public.admin_save_recruitment_question(null,'student',$1,'','select',$2::text[],true,1,true) as id",
    ["Preferred study window", ["Morning", "Evening"]])).rows[0].id;

  await assert.rejects(asUser("guest",
    "select public.admin_save_recruitment_question(null,'teacher','Hacked question','','short_text',null,true,2,true)"),
    /approved admin account/);
  assert.equal(Number((await asUser("guest", "select count(*) from public.recruitment_questions where label = 'Hacked question'")).rows[0].count), 0);

  // Application validation and storage ownership.
  await assert.rejects(asUser("guest",
    "insert into storage.objects(bucket_id,name) values ('recruitment-documents',$1)", [`${ids.teacherApplicant}/cv.pdf`]),
    /row-level security/);
  const teacherCv = await upload("teacherApplicant", "cv.pdf");
  const unusedCv = await upload("teacherApplicant", "unused.pdf");
  await asUser("teacherApplicant", "delete from storage.objects where name=$1", [unusedCv]);
  assert.equal(Number((await asUser("teacherApplicant", "select count(*) from storage.objects where name=$1", [unusedCv])).rows[0].count), 0);
  await asUser("teacherApplicant", "insert into storage.objects(bucket_id,name) values ('avatars',$1)", [`${ids.teacherApplicant}/photo.jpg`]);
  await assert.rejects(asUser("guest", "insert into storage.objects(bucket_id,name) values ('avatars',$1)", [`${ids.teacherApplicant}/other.jpg`]), /row-level security/);
  await assert.rejects(asUser("teacherApplicant", SUBMIT, teacherParams(null, {})), /Upload your CV/);
  const noPhoto = teacherParams(teacherCv, {});
  noPhoto[10] = null;
  await assert.rejects(asUser("teacherApplicant", SUBMIT, noPhoto), /profile photo/);
  await assert.rejects(asUser("teacherApplicant", SUBMIT, teacherParams(teacherCv, {})), /Please answer/);
  await assert.rejects(asUser("teacherApplicant", SUBMIT, teacherParams(teacherCv, { [teacherQuestion]: "x".repeat(2001) })), /too long/);

  const teacherAppId = (await asUser("teacherApplicant", SUBMIT, teacherParams(teacherCv, { [teacherQuestion]: "I love teaching." }))).rows[0].id;
  await asUser("teacherApplicant", "delete from storage.objects where name=$1", [teacherCv]);
  assert.equal(Number((await asUser("teacherApplicant", "select count(*) from storage.objects where name=$1", [teacherCv])).rows[0].count), 1);
  assert.equal(Number((await asUser("guest", "select count(*) from storage.objects where name=$1", [teacherCv])).rows[0].count), 0);
  assert.equal(Number((await asUser("admin", "select count(*) from storage.objects where name=$1", [teacherCv])).rows[0].count), 1);
  await assert.rejects(asUser("teacherApplicant", SUBMIT, teacherParams(teacherCv, { [teacherQuestion]: "Again." })), /open application/);
  assert.equal((await asUser("teacherApplicant", "select status, full_name from public.recruitment_applications")).rows[0].status, "submitted");

  // Students must be 16-25 on the server.
  const studentCv = await upload("studentYoung", "cv.pdf");
  await assert.rejects(asUser("studentYoung", SUBMIT, studentParams(studentCv, { [studentQuestion]: "Morning" }, yearsAgo(15))), /between 16 and 25/);
  const oldCv = await upload("studentOld", "cv.pdf");
  await assert.rejects(asUser("studentOld", SUBMIT, studentParams(oldCv, { [studentQuestion]: "Morning" }, yearsAgo(26))), /between 16 and 25/);
  const studentCvApplicant = await upload("studentApplicant", "cv.pdf");
  await assert.rejects(asUser("studentApplicant", SUBMIT, studentParams(studentCvApplicant, { [studentQuestion]: "Afternoon" }, yearsAgo(20))), /Choose one of the listed/);
  const studentAppId = (await asUser("studentApplicant", SUBMIT, studentParams(null, { [studentQuestion]: "Evening" }, yearsAgo(20)))).rows[0].id;
  assert.equal((await asUser("studentApplicant", "select cv_path from public.recruitment_applications where id=$1", [studentAppId])).rows[0].cv_path, null);
  await assert.rejects(asUser("studentApplicant", "select public.book_interview_slot(gen_random_uuid())"), /booking opens/);

  // Applicants see only their own applications; admins see all.
  assert.equal(Number((await asUser("studentApplicant", "select count(*) from public.recruitment_applications")).rows[0].count), 1);
  assert.equal(Number((await asUser("admin", "select count(*) from public.recruitment_applications")).rows[0].count), 2);

  // Review: applicants cannot review; admin rejects the student for now.
  await assert.rejects(asUser("teacherApplicant", "select public.admin_review_application($1,'invite','hi')", [teacherAppId]), /approved admin account/);
  await asUser("admin", "select public.admin_review_application($1,'reject','Not enough availability yet.')", [studentAppId]);
  assert.equal((await asUser("admin", "select status from public.recruitment_applications where id=$1", [studentAppId])).rows[0].status, "review_rejected");
  await assert.rejects(asUser("studentApplicant", SUBMIT, studentParams(studentCvApplicant, { [studentQuestion]: "Morning" }, yearsAgo(20))), /previous application is closed/);
  await asUser("admin", "select public.admin_reopen_application($1)", [studentAppId]);
  const studentCvRetry = await upload("studentApplicant", "cv-2.pdf");
  const studentAppRetry = (await asUser("studentApplicant", SUBMIT, studentParams(studentCvRetry, { [studentQuestion]: "Morning" }, yearsAgo(20)))).rows[0].id;

  await asUser("admin", "select public.admin_review_application($1,'invite','Good communication.')", [teacherAppId]);
  await asUser("admin", "select public.admin_review_application($1,'invite','Good fit for the student programme.')", [studentAppRetry]);

  // Interview slots: admin creates; overlaps and past times are rejected.
  const slotOne = (await asUser("admin",
    "select public.admin_create_interview_slot(date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour', 'https://meet.google.com/interview-one') as id")).rows[0].id;
  await assert.rejects(asUser("admin",
    "select public.admin_create_interview_slot(date_trunc('hour', now()) + interval '3 days 30 minutes', date_trunc('hour', now()) + interval '3 days 90 minutes', 'https://meet.google.com/interview-two')"),
    /overlaps/);
  await assert.rejects(asUser("admin",
    "select public.admin_create_interview_slot(now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 'https://meet.google.com/past')"),
    /start in the future/);
  let slotTwo = (await asUser("admin",
    "select public.admin_create_interview_slot(date_trunc('hour', now()) + interval '4 days', date_trunc('hour', now()) + interval '4 days 1 hour', 'https://meet.google.com/interview-three') as id")).rows[0].id;

  // Booking: teacher picks slot one; the student cannot take a booked slot.
  assert.equal(Number((await asUser("teacherApplicant", "select count(*) from public.interview_slots")).rows[0].count), 2);
  await asUser("teacherApplicant", "select public.book_interview_slot($1)", [slotOne]);
  assert.equal((await asUser("teacherApplicant", "select status from public.recruitment_applications where id=$1", [teacherAppId])).rows[0].status, "interview_booked");
  await assert.rejects(asUser("studentApplicant", "select public.book_interview_slot($1)", [slotOne]), /no longer available/);
  await asUser("studentApplicant", "select public.book_interview_slot($1)", [slotTwo]);
  await asUser("admin", "select public.admin_cancel_interview_slot($1)", [slotTwo]);
  assert.equal((await asUser("studentApplicant", "select status from public.recruitment_applications where id=$1", [studentAppRetry])).rows[0].status, "interview_invited");
  slotTwo = (await asUser("admin",
    "select public.admin_create_interview_slot(date_trunc('hour', now()) + interval '4 days', date_trunc('hour', now()) + interval '4 days 1 hour', 'https://meet.google.com/replacement') as id")).rows[0].id;
  await asUser("studentApplicant", "select public.book_interview_slot($1)", [slotTwo]);

  // Cancel and rebook is allowed before the interview starts.
  await asUser("studentApplicant", "select public.cancel_interview_booking()");
  assert.equal((await asUser("studentApplicant", "select status from public.recruitment_applications where id=$1", [studentAppRetry])).rows[0].status, "interview_invited");
  await asUser("studentApplicant", "select public.book_interview_slot($1)", [slotTwo]);

  // Final decision is blocked before the interview starts.
  await assert.rejects(asUser("admin", "select public.admin_record_interview_result($1,'accept','Strong candidate.')", [teacherAppId]), /not ended/);
  await superQuery("update public.interview_slots set starts_at=now()-interval '30 minutes', ends_at=now()+interval '30 minutes' where id=$1", [slotOne]);
  await assert.rejects(asUser("admin", "select public.admin_record_interview_result($1,'accept','Still ongoing.')", [teacherAppId]), /not ended/);
  await assert.rejects(asUser("teacherApplicant", "select public.cancel_interview_booking()"), /already started/);

  // Simulate that the interviews have happened.
  await superQuery("update public.interview_slots set starts_at = now() - interval '90 minutes', ends_at = now() - interval '30 minutes' where id = $1", [slotOne]);
  await superQuery("update public.interview_slots set starts_at = now() - interval '180 minutes', ends_at = now() - interval '120 minutes' where id = $1", [slotTwo]);
  await assert.rejects(asUser("admin", "select public.admin_record_interview_result($1,'accept','   ')", [teacherAppId]), /feedback/);

  // Internal feedback is hidden from the applicant.
  await asUser("admin", "select public.admin_record_interview_result($1,'accept','Warm, clear, and prepared. Strong teacher candidate.')", [teacherAppId]);
  assert.equal(Number((await asUser("teacherApplicant", "select count(*) from public.recruitment_feedback")).rows[0].count), 0);
  assert.equal(Number((await asUser("admin", "select count(*) from public.recruitment_feedback where application_id=$1", [teacherAppId])).rows[0].count), 2);

  // Acceptance syncs the account into a teacher profile.
  const teacherProfile = (await asUser("teacherApplicant", "select role, status, participation_status, requested_role, bio from public.profiles where id=$1", [ids.teacherApplicant])).rows[0];
  assert.deepEqual(teacherProfile, { role: "teacher", status: "approved", participation_status: "active", requested_role: null, bio: "I teach patient English conversation." });
  assert.equal((await asUser("teacherApplicant", "select status from public.recruitment_applications where id=$1", [teacherAppId])).rows[0].status, "accepted");
  const approved = (await asUser("admin", "select member_number from public.profiles where id=$1", [ids.teacherApplicant])).rows[0].member_number;
  assert.ok(approved > 0);
  assert.equal(Number((await asUser("guest", "select count(*) from public.public_teacher_directory() where full_name='Teacher Applicant'")).rows[0].count), 1);
  await assert.rejects(asUser("admin", "select public.admin_record_interview_result($1,'accept','Duplicate decision.')", [teacherAppId]), /booked interview/);
  await asUser("admin", "select public.review_member($1,'suspended')", [ids.teacherApplicant]);
  await asUser("admin", "select public.review_member($1,'approved')", [ids.teacherApplicant]);
  assert.equal((await asUser("admin", "select member_number from public.profiles where id=$1", [ids.teacherApplicant])).rows[0].member_number, approved);
  await assert.rejects(asUser("teacherApplicant", SUBMIT, teacherParams(teacherCv, { [teacherQuestion]: "Again" })), /already has an ABVN role/);

  // Student interview rejection, then no reapply without a reopen.
  await assert.rejects(asUser("admin", "select public.admin_record_interview_result($1,'reject','   ')", [studentAppRetry]), /feedback/);
  await asUser("admin", "select public.admin_record_interview_result($1,'reject','Availability does not match the schedule.')", [studentAppRetry]);
  assert.equal((await asUser("studentApplicant", "select role from public.profiles where id=$1", [ids.studentApplicant])).rows[0].role, null);
  await assert.rejects(asUser("studentApplicant", SUBMIT, studentParams(studentCvRetry, { [studentQuestion]: "Morning" }, yearsAgo(20))), /previous application is closed/);
  await asUser("admin", "select public.admin_reopen_application($1)", [studentAppRetry]);
  const acceptedStudentApp = (await asUser("studentApplicant", SUBMIT, studentParams(null, { [studentQuestion]: "Morning" }, yearsAgo(20)))).rows[0].id;
  await asUser("admin", "select public.admin_review_application($1,'invite','Ready for a new interview.')", [acceptedStudentApp]);
  const studentSlot = (await asUser("admin", "select public.admin_create_interview_slot(now()+interval '5 days',now()+interval '5 days 30 minutes','https://meet.google.com/student-retry') as id")).rows[0].id;
  await asUser("studentApplicant", "select public.book_interview_slot($1)", [studentSlot]);
  await superQuery("update public.interview_slots set starts_at=now()-interval '5 hours', ends_at=now()-interval '4 hours 30 minutes' where id=$1", [studentSlot]);
  await asUser("admin", "select public.admin_record_interview_result($1,'accept','Good goals and availability.')", [acceptedStudentApp]);
  assert.deepEqual((await asUser("studentApplicant", "select role,status,participation_status from public.profiles where id=$1", [ids.studentApplicant])).rows[0], { role: "student", status: "approved", participation_status: "active" });
  assert.equal(Number((await asUser("studentApplicant", "select count(*) from public.recruitment_feedback")).rows[0].count), 0);

  // Exact age boundaries are inclusive; supporting documents remain optional.
  await asUser("studentYoung", SUBMIT, studentParams(null, { [studentQuestion]: "Morning" }, yearsAgo(16)));
  await asUser("studentOld", SUBMIT, studentParams(null, { [studentQuestion]: "Morning" }, yearsAgo(25)));
  await superQuery("update public.profiles set status='suspended' where id=$1", [ids.guest]);
  await assert.rejects(asUser("guest", SUBMIT, studentParams(null, { [studentQuestion]: "Morning" }, yearsAgo(20))), /suspended/);
  await superQuery("update public.profiles set status='pending' where id=$1", [ids.guest]);

  // Guests are signed-in accounts with no role; the admin Guests view reads them.
  const guests = (await asUser("admin", "select id from public.profiles where role is null and requested_role is null order by email")).rows.map(row => row.id);
  assert.ok(guests.includes(ids.guest));
  assert.ok(!guests.includes(ids.teacherApplicant));

  // Question changes do not affect submitted snapshots.
  await asUser("admin", "select public.admin_save_recruitment_question($1,'teacher','Edited label','','long_text',null,true,1,false)", [teacherQuestion]);
  assert.equal((await asUser("admin", "select answers->0->>'label' as label from public.recruitment_applications where id=$1", [teacherAppId])).rows[0].label, "Why do you want to teach with ABVN?");
});
