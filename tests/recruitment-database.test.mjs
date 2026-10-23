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
  assignable: "00000000-0000-4000-8000-0000000000a7",
  removable: "00000000-0000-4000-8000-0000000000a8",
  adminOnly: "00000000-0000-4000-8000-0000000000a9",
  adminGuest: "00000000-0000-4000-8000-0000000000aa",
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
  await superQuery("select 1");
  await db.exec(await readFile(new URL("../supabase/migrations/202610220017_recruitment_form_fields.sql", import.meta.url), "utf8"));
  const teacherDetails = (await asUser("teacherApplicant", "select * from public.profile_application_details")).rows[0];
  assert.equal(teacherDetails.phone, "+84 900 000 000");
  assert.equal(teacherDetails.weekly_hours, 6);
  assert.equal(teacherDetails.intro_video_url, "https://www.youtube.com/watch?v=intro");
  assert.equal(teacherDetails.answers[0].answer, "I love teaching.");
  assert.deepEqual((await asUser("guest", "select * from public.profile_application_details")).rows, []);
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
  assert.equal((await asUser("studentApplicant", "select application_id from public.profile_application_details")).rows[0].application_id, acceptedStudentApp);
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

  await t.test("personal question editing protects identity and enforces optional fields on submission", async () => {
    assert.equal((await asUser("admin", "select * from public.recruitment_form_fields")).rows.length, 22);
    await asUser("admin", "select public.admin_save_application_field('teacher','full_name','Your full name','Use your legal name',true,2,true)");
    assert.equal((await asUser("guest", "select label from public.recruitment_form_fields where role='teacher' and field_key='full_name'")).rows[0].label, "Your full name");
    for (const [role, key] of [["teacher","full_name"],["teacher","photo"],["teacher","cv"],["student","date_of_birth"]]) {
      await assert.rejects(asUser("admin", "select public.admin_manage_application_question($1,$2,true,'hide')", [role,key]), /check constraint/);
      await assert.rejects(asUser("admin", "select public.admin_manage_application_question($1,$2,true,'delete')", [role,key]), /check constraint/);
    }
    await assert.rejects(asUser("teacherApplicant", "select public.admin_manage_application_question('teacher',$1,false,'delete')", [teacherQuestion]), /approved admin/);
    await assert.rejects(asUser("guest", "select public.admin_save_application_field('teacher','full_name','Hacked','',true,1,true)"), /approved admin/);
    await assert.rejects(asUser("admin", "update public.recruitment_form_fields set active=false"), /permission denied/);
    await asUser("admin", "select public.admin_manage_application_question('student','intro_video_url',true,'hide')");
    const params = studentParams(null, { [studentQuestion]: "Morning" }, yearsAgo(20));
    params[8] = "https://vimeo.com/123456";
    await assert.rejects(asUser("guest", SUBMIT, params), /form changed/);
    await asUser("admin", "select public.admin_manage_application_question('student','intro_video_url',true,'unhide')");
    await asUser("admin", "select public.admin_save_application_field('student','intro_video_url','Introduce yourself','YouTube or Vimeo',true,10,true)");
    params[8] = null;
    await assert.rejects(asUser("guest", SUBMIT, params), /Please provide: Introduce yourself/);
    assert.deepEqual((await asUser("guest", "select * from public.recruitment_applications")).rows, []);
    params[8] = "https://vimeo.com/123456";
    await asUser("guest", SUBMIT, params);
    assert.deepEqual((await asUser("guest", "select * from public.profile_application_details")).rows, []);
    await asUser("admin", "select public.admin_manage_application_question('teacher',$1,false,'hide')", [teacherQuestion]);
    await asUser("admin", "select public.admin_manage_application_question('teacher',$1,false,'unhide')", [teacherQuestion]);
    await asUser("admin", "select public.admin_manage_application_question('teacher',$1,false,'delete')", [teacherQuestion]);
    assert.equal((await asUser("admin", "select * from public.recruitment_questions where id=$1", [teacherQuestion])).rows.length, 0);
    assert.equal((await asUser("teacherApplicant", "select answers->0->>'answer' as answer from public.profile_application_details")).rows[0].answer, "I love teaching.");
    await asUser("admin", "select public.admin_manage_application_question('student','photo',true,'delete')");
    assert.equal((await asUser("admin", "select deleted from public.recruitment_form_fields where role='student' and field_key='photo'")).rows[0].deleted, true);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.profile_application_details"), /permission denied/);
    await assert.rejects(db.query("select public.admin_manage_application_question('teacher','phone',true,'delete')"), /permission denied/);
  });

  await t.test("interview details support atomic assignment, internal assessments, safe cancellation and duration limits", async () => {
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220018_interview_slot_details.sql", import.meta.url),"utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/202610230019_slot_edit_notifications.sql", import.meta.url),"utf8"));
    const legacyCancelled=(await asUser("admin","select public.admin_create_interview_slot(now()+interval '60 days',now()+interval '60 days 30 minutes','https://meet.google.com/legacy-cancelled') as id")).rows[0].id;
    const assessedCancelled=(await asUser("admin","select public.admin_create_interview_slot(now()+interval '61 days',now()+interval '61 days 30 minutes','https://meet.google.com/assessed-cancelled') as id")).rows[0].id;
    await superQuery("update public.interview_slots set status='cancelled',ever_booked=true where id in ($1,$2)",[legacyCancelled,assessedCancelled]);
    await superQuery(`insert into public.interview_assessments(slot_id,application_id,admin_id,note)
      select $1,id,$2,'Retain cancelled slot with assessment'
      from public.recruitment_applications where applicant_id=$3`,[assessedCancelled,ids.admin,ids.studentYoung]);
    await db.exec(await readFile(new URL("../supabase/migrations/202610230020_remove_legacy_unbooked_interviews.sql", import.meta.url),"utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/202610230021_account_management.sql", import.meta.url),"utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/202610230022_combined_admin_roles.sql", import.meta.url),"utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/202610230023_role_management.sql", import.meta.url),"utf8"));
    assert.equal((await asUser("admin","select * from public.interview_slots where id=$1",[legacyCancelled])).rows.length,0);
    assert.equal((await asUser("admin","select status from public.interview_slots where id=$1",[assessedCancelled])).rows[0].status,"cancelled");
    const youngApp=(await asUser("admin","select id from public.recruitment_applications where applicant_id=$1",[ids.studentYoung])).rows[0].id;
    const oldApp=(await asUser("admin","select id from public.recruitment_applications where applicant_id=$1",[ids.studentOld])).rows[0].id;
    const offer=`select public.admin_offer_interview_slot(now()+interval '40 days',now()+interval '40 days 75 minutes',
      'https://meet.google.com/assessment','Student interview','Discuss your learning goals',$1) as id`;
    await assert.rejects(asUser("admin",offer,[youngApp]),/passed the application round/);
    await asUser("admin","select public.admin_review_application($1,'invite','Ready for interview')",[youngApp]);
    await superQuery("update public.profiles set status='suspended' where id=$1",[ids.studentYoung]);
    await assert.rejects(asUser("admin",offer,[youngApp]),/no longer eligible/);
    await superQuery("update public.profiles set status='pending' where id=$1",[ids.studentYoung]);
    const slotId=(await asUser("admin",offer,[youngApp])).rows[0].id;
    const assigned=(await asUser("admin","select * from public.interview_slots where id=$1",[slotId])).rows[0];
    assert.equal(assigned.title,"Student interview");
    assert.equal(assigned.description,"Discuss your learning goals");
    assert.equal(assigned.created_by,ids.admin);
    assert.equal(assigned.application_id,youngApp);
    assert.equal(assigned.ever_booked,true);
    assert.equal((await asUser("studentYoung","select status from public.recruitment_applications")).rows[0].status,"interview_booked");
    await asUser("admin","select public.admin_edit_interview_slot($1,$2,$3,$4,$5,$6)",[
      slotId,assigned.starts_at,assigned.ends_at,assigned.meeting_url,assigned.title,"Description updated without a schedule change",
    ]);
    assert.equal((await asUser("studentYoung","select * from public.schedule_change_notifications")).rows.length,0);
    await assert.rejects(asUser("studentYoung","select public.admin_edit_interview_slot($1,$2,$3,$4,$5,$6)",[
      slotId,assigned.starts_at,assigned.ends_at,assigned.meeting_url,assigned.title,"No access",
    ]),/approved admin/);
    await asUser("admin","select public.admin_edit_interview_slot($1,now()+interval '41 days',now()+interval '41 days 90 minutes',$2,$3,$4)",[
      slotId,assigned.meeting_url,"Rescheduled interview","New interview description",
    ]);
    const interviewNotice=(await asUser("studentYoung","select * from public.schedule_change_notifications")).rows[0];
    assert.equal(interviewNotice.slot_type,"interview");
    assert.equal(interviewNotice.slot_id,slotId);
    assert.equal(interviewNotice.slot_title,"Rescheduled interview");
    assert.equal(Date.parse(interviewNotice.previous_starts_at),Date.parse(assigned.starts_at));
    assert.equal(Date.parse(interviewNotice.ends_at),Date.parse(interviewNotice.starts_at)+90*60_000);
    assert.deepEqual((await asUser("studentOld","select * from public.schedule_change_notifications")).rows,[]);
    assert.deepEqual((await asUser("admin","select * from public.schedule_change_notifications")).rows,[]);
    await asUser("studentYoung","select public.member_read_schedule_change($1)",[interviewNotice.id]);
    assert.ok((await asUser("studentYoung","select read_at from public.schedule_change_notifications where id=$1",[interviewNotice.id])).rows[0].read_at);
    await assert.rejects(asUser("studentOld","select public.member_read_schedule_change($1)",[interviewNotice.id]),/notification is unavailable/);
    await asUser("admin","select public.admin_review_application($1,'invite','Another eligible applicant')",[oldApp]);
    await assert.rejects(asUser("admin",offer.replaceAll("40 days","41 days"),[oldApp]),/overlaps/);
    assert.equal((await asUser("studentOld","select status from public.recruitment_applications")).rows[0].status,"interview_invited");
    await assert.rejects(asUser("admin",offer,[youngApp]),/passed the application round/);
    await assert.rejects(asUser("studentYoung",offer,[oldApp]),/approved admin/);
    await assert.rejects(asUser("admin","select public.admin_add_interview_assessment($1,$2,'Incorrect applicant')",[slotId,oldApp]),/slot has changed/);
    await asUser("admin","select public.admin_add_interview_assessment($1,$2,'Private monitoring: strong motivation')",[slotId,youngApp]);
    assert.equal((await asUser("admin","select note from public.interview_assessments where slot_id=$1",[slotId])).rows[0].note,"Private monitoring: strong motivation");
    for (const user of ["studentYoung","teacherApplicant","guest"]) {
      assert.deepEqual((await asUser(user,"select * from public.interview_assessments")).rows,[]);
      await assert.rejects(asUser(user,"select public.admin_add_interview_assessment($1,$2,'Forged')",[slotId,youngApp]),/approved admin/);
    }
    await assert.rejects(asUser("admin","select public.admin_add_interview_assessment($1,$2,'  ')",[slotId,youngApp]),/check constraint/);
    await asUser("admin","select public.admin_cancel_interview_slot($1)",[slotId]);
    const cancelled=(await asUser("admin","select * from public.interview_slots where id=$1",[slotId])).rows[0];
    assert.equal(cancelled.status,"cancelled");
    assert.equal(cancelled.last_application_id,youngApp);
    assert.equal(cancelled.application_id,null);
    assert.equal((await asUser("studentYoung","select status from public.recruitment_applications")).rows[0].status,"interview_invited");
    assert.equal((await asUser("admin","select * from public.interview_assessments where slot_id=$1",[slotId])).rows.length,1);
    const open=(await asUser("admin",offer,[null])).rows[0].id;
    assert.equal((await asUser("admin","select ever_booked from public.interview_slots where id=$1",[open])).rows[0].ever_booked,false);
    await asUser("admin","select public.admin_cancel_interview_slot($1)",[open]);
    assert.equal((await asUser("admin","select * from public.interview_slots where id=$1",[open])).rows.length,0);
    const legacyOpen=(await asUser("admin","select public.admin_create_interview_slot(now()+interval '55 days',now()+interval '55 days 30 minutes','https://meet.google.com/legacy-open') as id")).rows[0].id;
    await superQuery("update public.interview_slots set ever_booked=true where id=$1",[legacyOpen]);
    await asUser("admin","select public.admin_cancel_interview_slot($1)",[legacyOpen]);
    assert.equal((await asUser("admin","select * from public.interview_slots where id=$1",[legacyOpen])).rows.length,0);
    const previouslyBooked=(await asUser("admin",offer,[null])).rows[0].id;
    await asUser("studentYoung","select public.book_interview_slot($1)",[previouslyBooked]);
    await asUser("studentYoung","select public.cancel_interview_booking()");
    await asUser("admin","select public.admin_cancel_interview_slot($1)",[previouslyBooked]);
    assert.equal((await asUser("admin","select status,ever_booked from public.interview_slots where id=$1",[previouslyBooked])).rows[0].status,"cancelled");
    const before=Number((await asUser("admin","select count(*) from public.interview_slots")).rows[0].count);
    await assert.rejects(asUser("admin",offer.replace("'Student interview'","''"),[youngApp]),/check constraint/);
    assert.equal(Number((await asUser("admin","select count(*) from public.interview_slots")).rows[0].count),before);
    assert.equal((await asUser("studentYoung","select status from public.recruitment_applications")).rows[0].status,"interview_invited");
    for (const minutes of [29,30.5,121]) {
      await assert.rejects(asUser("admin",`select public.admin_offer_interview_slot(now()+interval '50 days',now()+interval '50 days'+$1*interval '1 minute','https://meet.google.com/invalid','Interview','',null)`,[minutes]),/Duration|duration/);
      await assert.rejects(superQuery(`insert into public.lesson_slots(teacher_id,starts_at,ends_at,meeting_url) values($1,now()+interval '50 days',now()+interval '50 days'+$2*interval '1 minute','https://meet.google.com/lesson')`,[ids.teacherApplicant,minutes]),/Duration/);
    }
    const lessonSlot=(await asUser("teacherApplicant","select public.create_lesson_slot(now()+interval '70 days',now()+interval '70 days 90 minutes','https://meet.google.com/custom-duration') as id")).rows[0].id;
    await superQuery("update public.lesson_slots set status='booked' where id=$1",[lessonSlot]);
    await superQuery(`insert into public.bookings(slot_id,student_id,starts_at,ends_at)
      select id,$2,starts_at,ends_at from public.lesson_slots where id=$1`,[lessonSlot,ids.studentOld]);
    const originalLesson=(await asUser("teacherApplicant","select starts_at,ends_at,meeting_url,title from public.lesson_slots where id=$1",[lessonSlot])).rows[0];
    await asUser("teacherApplicant","select public.edit_calendar_slot($1,$2,$3,$4,$5,$6)",[
      lessonSlot,originalLesson.starts_at,originalLesson.ends_at,originalLesson.meeting_url,"Lesson details updated","Description updated only",
    ]);
    assert.deepEqual((await asUser("studentOld","select * from public.schedule_change_notifications")).rows,[]);
    await assert.rejects(asUser("studentOld","select public.edit_calendar_slot($1,$2,$3,$4,$5,$6)",[
      lessonSlot,originalLesson.starts_at,originalLesson.ends_at,originalLesson.meeting_url,"Unauthorized change","",
    ]),/approved teacher/);
    await asUser("admin","select public.edit_calendar_slot($1,$2,$3,$4,$5,$6)",[
      lessonSlot,originalLesson.starts_at,originalLesson.ends_at,originalLesson.meeting_url,"Admin-updated lesson title","Admin-updated description",
    ]);
    await asUser("teacherApplicant","select public.edit_calendar_slot($1,now()+interval '72 days',now()+interval '72 days 90 minutes',$2,$3,$4)",[
      lessonSlot,originalLesson.meeting_url,"Moved lesson","Schedule changed",
    ]);
    const lessonNotice=(await asUser("studentOld","select * from public.schedule_change_notifications")).rows[0];
    assert.equal(lessonNotice.slot_type,"lesson");
    assert.equal(lessonNotice.slot_id,lessonSlot);
    const synchronized=(await asUser("teacherApplicant",`select s.starts_at as slot_start,s.ends_at as slot_end,b.starts_at as booking_start,b.ends_at as booking_end
      from public.lesson_slots s join public.bookings b on b.slot_id=s.id where s.id=$1`,[lessonSlot])).rows[0];
    assert.equal(Date.parse(synchronized.slot_start),Date.parse(synchronized.booking_start));
    assert.equal(Date.parse(synchronized.slot_end),Date.parse(synchronized.booking_end));
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select * from public.interview_assessments"),/permission denied/);
    await assert.rejects(db.query(offer,[null]),/permission denied/);
  });

  await t.test("All accounts actions assign approved roles and safely remove eligible accounts", async () => {
    await assert.rejects(
      asUser("guest", "select public.admin_assign_member_role($1,'teacher')", [ids.assignable]),
      /approved admin account/,
    );
    await asUser("admin", "select public.admin_assign_member_role($1,'teacher')", [ids.assignable]);
    await asUser("admin", "select public.admin_assign_member_role($1,'admin')", [ids.assignable]);
    const assigned = (await asUser("admin", "select role,admin_access,status,participation_status,requested_role,member_number from public.profiles where id=$1", [ids.assignable])).rows[0];
    assert.deepEqual(assigned, {
      role: "teacher",
      admin_access: true,
      status: "approved",
      participation_status: "active",
      requested_role: null,
      member_number: assigned.member_number,
    });
    assert.ok(assigned.member_number > 0);
    assert.equal((await asUser("assignable", "select public.is_admin() as admin")).rows[0].admin, true);
    await asUser("admin", "select public.admin_remove_member_role($1,'teacher')", [ids.assignable]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,participation_status from public.profiles where id=$1", [ids.assignable])).rows[0],
      { role: "teacher", admin_access: true, participation_status: "inactive" },
    );
    await asUser("admin", "select public.admin_assign_member_role($1,'teacher')", [ids.assignable]);
    assert.equal((await asUser("admin", "select participation_status from public.profiles where id=$1", [ids.assignable])).rows[0].participation_status, "active");
    await asUser("admin", "select public.admin_remove_member_role($1,'admin')", [ids.assignable]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,participation_status from public.profiles where id=$1", [ids.assignable])).rows[0],
      { role: "teacher", admin_access: false, participation_status: "active" },
    );
    await asUser("admin", "select public.admin_assign_member_role($1,'admin')", [ids.assignable]);
    await assert.rejects(
      asUser("admin", "select public.review_member($1,'suspended')", [ids.assignable]),
      /cannot be managed/,
    );
    await assert.rejects(
      asUser("admin", "select public.admin_remove_member_account($1)", [ids.assignable]),
      /Administrator accounts cannot be removed/,
    );
    await assert.rejects(
      asUser("admin", "select public.admin_assign_member_role($1,'student')", [ids.assignable]),
      /already has a role/,
    );

    await asUser("admin", "select public.admin_assign_member_role($1,'admin')", [ids.adminOnly]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,status from public.profiles where id=$1", [ids.adminOnly])).rows[0],
      { role: "admin", admin_access: true, status: "approved" },
    );
    await asUser("admin", "select public.admin_assign_member_role($1,'student')", [ids.adminOnly]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,status,participation_status from public.profiles where id=$1", [ids.adminOnly])).rows[0],
      { role: "student", admin_access: true, status: "approved", participation_status: "active" },
    );
    await asUser("admin", "select public.admin_remove_member_role($1,'admin')", [ids.adminOnly]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,status,participation_status from public.profiles where id=$1", [ids.adminOnly])).rows[0],
      { role: "student", admin_access: false, status: "approved", participation_status: "active" },
    );
    await asUser("admin", "select public.admin_assign_member_role($1,'admin')", [ids.adminOnly]);
    assert.equal((await asUser("adminOnly", "select public.is_admin() as admin")).rows[0].admin, true);
    await assert.rejects(
      asUser("admin", "select public.admin_assign_member_role($1,'teacher')", [ids.adminOnly]),
      /already has a role/,
    );

    await asUser("admin", "select public.admin_assign_member_role($1,'admin')", [ids.adminGuest]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,status from public.profiles where id=$1", [ids.adminGuest])).rows[0],
      { role: "admin", admin_access: true, status: "approved" },
    );
    await asUser("admin", "select public.admin_remove_member_role($1,'admin')", [ids.adminGuest]);
    assert.deepEqual(
      (await asUser("admin", "select role,admin_access,status from public.profiles where id=$1", [ids.adminGuest])).rows[0],
      { role: null, admin_access: false, status: "pending" },
    );
    await assert.rejects(
      asUser("admin", "select public.admin_remove_member_role($1,'admin')", [ids.admin]),
      /own Admin access/,
    );

    const studentApplication = (await asUser("admin",
      "select id from public.recruitment_applications where applicant_id=$1 and status='interview_invited'",
      [ids.studentYoung])).rows[0].id;
    const bookedSlot = (await asUser("admin",
      "select public.admin_offer_interview_slot(now()+interval '80 days',now()+interval '80 days 30 minutes','https://meet.google.com/direct-assignment','Student interview','',$1) as id",
      [studentApplication])).rows[0].id;
    await asUser("admin", "select public.admin_assign_member_role($1,'student')", [ids.studentYoung]);
    assert.deepEqual(
      (await asUser("admin", "select role,status,participation_status from public.profiles where id=$1", [ids.studentYoung])).rows[0],
      { role: "student", status: "approved", participation_status: "active" },
    );
    assert.equal((await asUser("admin", "select status from public.recruitment_applications where id=$1", [studentApplication])).rows[0].status, "accepted");
    assert.deepEqual(
      (await asUser("admin", "select status,application_id,last_application_id from public.interview_slots where id=$1", [bookedSlot])).rows[0],
      { status: "cancelled", application_id: null, last_application_id: studentApplication },
    );
    assert.ok((await asUser("admin", "select profile_id from public.profile_application_details where profile_id=$1", [ids.studentYoung])).rows.length);
    await asUser("admin", "select public.admin_remove_member_account($1)", [ids.studentYoung]);
    assert.equal((await superQuery("select id from public.profiles where id=$1", [ids.studentYoung])).rows.length, 0);
    assert.equal((await superQuery("select profile_id from public.profile_application_details where profile_id=$1", [ids.studentYoung])).rows.length, 0);
    assert.deepEqual(
      (await superQuery("select status,application_id,last_application_id from public.interview_slots where id=$1", [bookedSlot])).rows[0],
      { status: "cancelled", application_id: null, last_application_id: null },
    );

    await assert.rejects(
      asUser("admin", "select public.admin_remove_member_account($1)", [ids.admin]),
      /own account/,
    );
    await assert.rejects(
      asUser("admin", "select public.admin_remove_member_account($1)", [ids.teacherApplicant]),
      /lesson history/,
    );
    assert.ok((await asUser("admin", "select id from public.profiles where id=$1", [ids.teacherApplicant])).rows.length);

    await superQuery("alter table public.recruitment_applications disable trigger validate_application_fields");
    const removableApp = (await superQuery(`insert into public.recruitment_applications
      (applicant_id,role,status,full_name,email,phone,country,time_zone,date_of_birth,intro,weekly_hours,answers,cv_path)
      values ($1,'student','interview_invited','Removable applicant','removable@example.test','+84 900 000 008',
        'Vietnam','UTC',$2::date,'Test account removal',3,'[]'::jsonb,null) returning id`,
    [ids.removable, yearsAgo(20)])).rows[0].id;
    await superQuery("alter table public.recruitment_applications enable trigger validate_application_fields");
    const removableSlot = (await asUser("admin",
      "select public.admin_offer_interview_slot(now()+interval '90 days',now()+interval '90 days 30 minutes','https://meet.google.com/removal','Student interview','',$1) as id",
      [removableApp])).rows[0].id;
    await asUser("admin", "select public.admin_add_interview_assessment($1,$2,'Private assessment to remove')", [removableSlot, removableApp]);
    await superQuery(`insert into storage.objects(bucket_id,name) values
      ('avatars',$1),('recruitment-documents',$2)`,
    [`${ids.removable}/photo.png`, `${ids.removable}/application.pdf`]);
    await asUser("admin", "select public.admin_remove_member_account($1)", [ids.removable]);
    assert.equal((await superQuery("select id from auth.users where id=$1", [ids.removable])).rows.length, 0);
    assert.equal((await superQuery("select id from public.profiles where id=$1", [ids.removable])).rows.length, 0);
    assert.equal((await superQuery("select id from public.recruitment_applications where id=$1", [removableApp])).rows.length, 0);
    assert.equal((await superQuery("select id from public.interview_assessments where application_id=$1", [removableApp])).rows.length, 0);
    assert.deepEqual(
      (await superQuery("select status,application_id,last_application_id from public.interview_slots where id=$1", [removableSlot])).rows[0],
      { status: "cancelled", application_id: null, last_application_id: null },
    );
    assert.equal((await superQuery("select name from storage.objects where name like $1", [`${ids.removable}/%`])).rows.length, 0);

    const renewedId = "00000000-0000-4000-8000-0000000000ac";
    await superQuery("insert into auth.users(id,email) values ($1,'removable@example.test')", [renewedId]);
    assert.deepEqual(
      (await superQuery("select role,status from public.profiles where id=$1", [renewedId])).rows[0],
      { role: null, status: "pending" },
    );

    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select public.admin_remove_member_account($1)", [renewedId]),
      /permission denied/,
    );
  });
});
