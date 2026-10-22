import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { defaultContent } from "../src/lib/content/schema.ts";
import { articlePlainText } from "../src/lib/content/rich-text.ts";
import { articleToDelta, deltaToArticle } from "../src/lib/content/quill.ts";
import { mergeContentDraft } from "../src/lib/content/merge.ts";

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  teacher: "00000000-0000-4000-8000-000000000002",
  teacher2: "00000000-0000-4000-8000-000000000003",
  student: "00000000-0000-4000-8000-000000000004",
  student2: "00000000-0000-4000-8000-000000000005",
  pending: "00000000-0000-4000-8000-000000000006",
};

test("PostgreSQL integration: permissions and connected lesson lifecycle", async (t) => {
  const db = new PGlite({ extensions: { btree_gist } });
  t.after(() => db.close());
  // Only Supabase-owned auth/storage primitives are stubbed. The application
  // migration, RLS, grants, constraints, and RPC functions run unchanged.
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
  const sql = await readFile(
    new URL(
      "../supabase/migrations/202610200001_learning_platform.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  for (const [name, id] of Object.entries(ids)) {
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)",
      [
        id,
        `${name}@example.test`,
        JSON.stringify({ full_name: name, role: "admin" }),
      ],
    );
  }
  await db.exec(`update public.profiles set role = case
      when full_name = 'admin' then 'admin'::public.account_role
      when full_name like 'teacher%' then 'teacher'::public.account_role
      else 'student'::public.account_role end, status = 'approved'
    where full_name <> 'pending';`);
  const legacySlot = (await db.query(`insert into public.lesson_slots(teacher_id,starts_at,ends_at,meeting_url,status)
    values ($1,now()+interval '10 days',now()+interval '10 days 1 hour','https://meet.google.com/legacy','booked') returning id`, [ids.teacher])).rows[0].id;
  await db.query(`insert into public.bookings(slot_id,student_id,starts_at,ends_at)
    select id,$2,starts_at,ends_at from public.lesson_slots where id=$1`, [legacySlot, ids.student]);
  const legacyUnbookedCancelledSlot = (await db.query(`insert into public.lesson_slots(teacher_id,starts_at,ends_at,meeting_url,status)
    values ($1,now()+interval '12 days',now()+interval '12 days 1 hour','https://meet.google.com/legacy-cancelled','cancelled') returning id`, [ids.teacher])).rows[0].id;
  await db.exec(await readFile(new URL("../supabase/migrations/202610210001_dashboard_calendar.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610210002_schedule_preferences.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610210003_member_management.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610210004_calendar_details.sql", import.meta.url), "utf8"));
  await db.query(`insert into public.lesson_feedback(booking_id,author_id,author_role,comment,rating)
    select id,student_id,'student','Legacy rated feedback',4 from public.bookings where slot_id=$1`, [legacySlot]);
  await db.exec(await readFile(new URL("../supabase/migrations/202610210005_written_feedback.sql", import.meta.url), "utf8"));
  assert.equal((await db.query("select rating from public.lesson_feedback where comment='Legacy rated feedback'")).rows[0].rating, 4);
  assert.equal((await db.query("select title from public.lesson_slots where id=$1", [legacySlot])).rows[0].title, "English conversation");
  assert.equal((await db.query("select student_id from public.bookings where slot_id=$1", [legacySlot])).rows[0].student_id, ids.student);
  assert.equal((await db.query("select count(*) as n from public.profiles")).rows[0].n, Object.keys(ids).length);
  await db.exec(await readFile(new URL("../supabase/migrations/202610210006_shared_calendar.sql", import.meta.url), "utf8"));
  assert.equal((await db.query("select count(*) as n from public.lesson_slots where id=$1", [legacyUnbookedCancelledSlot])).rows[0].n, 0);
  await db.query("delete from public.lesson_feedback where booking_id in (select id from public.bookings where slot_id=$1)", [legacySlot]);
  await db.query("delete from public.bookings where slot_id=$1", [legacySlot]);
  await db.query("delete from public.lesson_slots where id=$1", [legacySlot]);

  async function asUser(name, query, params = []) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      ids[name] ?? "",
    ]);
    await db.exec("set role authenticated");
    return db.query(query, params);
  }
  async function superQuery(query, params = []) {
    await db.exec("reset role");
    return db.query(query, params);
  }
  async function slot(name, days, hour = 12) {
    const result = await asUser(
      name,
      `select public.create_lesson_slot(
      date_trunc('day', now()) + $1 * interval '1 day' + $2 * interval '1 hour',
      date_trunc('day', now()) + $1 * interval '1 day' + ($2 + 1) * interval '1 hour',
      'https://meet.google.com/abc-defg-hij') as id`,
      [days, hour],
    );
    return result.rows[0].id;
  }

  await t.test("approved members receive stable sequential numbers per role; pending members cannot assign one", async () => {
    const numbers = (await superQuery("select full_name,member_number from public.profiles order by id")).rows;
    assert.deepEqual(numbers.map(row => row.member_number), [null, 1, 2, 1, 2, null]);
    await assert.rejects(asUser("pending", "update public.profiles set member_number=99 where id=auth.uid()"), /permission denied/);
    await assert.rejects(asUser("student", "select * from public.member_number_counters"), /permission denied/);
    await assert.rejects(asUser("student", "select public.assign_member_number()"), /permission denied/);
    await superQuery("begin");
    try {
      await assert.rejects(superQuery("update public.profiles set member_number=99 where id=$1", [ids.teacher]), /cannot be changed/);
    } finally { await db.exec("rollback"); }

  });

  await t.test(
    "OAuth metadata cannot assign roles; accounts start pending",
    async () => {
      const result = await asUser(
        "pending",
        "select role,status,requested_role from public.profiles",
      );
      assert.deepEqual(result.rows, [
        { role: null, status: "pending", requested_role: null },
      ]);
      await assert.rejects(
        asUser("pending", "select * from public.available_lessons()"),
        /approved student/,
      );
      await assert.rejects(
        asUser("pending", "select public.request_membership('admin')"),
        /teacher or student/,
      );
      await asUser("pending", "select public.request_membership('student')");
      await assert.rejects(
        asUser("pending", "update public.profiles set role='admin'"),
        /permission denied/,
      );
      await assert.rejects(
        asUser("student", "select public.review_member($1,'approved')", [
          ids.pending,
        ]),
        /approved admin/,
      );
      await asUser("admin", "select public.review_member($1,'approved')", [
        ids.pending,
      ]);
      const result2 = await asUser(
        "pending",
        "select role,status from public.profiles",
      );
      assert.deepEqual(result2.rows, [{ role: "student", status: "approved" }]);
      const number = (await asUser("pending", "select member_number from public.profiles")).rows[0].member_number;
      assert.equal(number, 3);
      await asUser("admin", "select public.review_member($1,'approved')", [ids.pending]);
      await asUser("admin", "select public.review_member($1,'suspended')", [ids.pending]);
      await asUser("admin", "select public.review_member($1,'approved')", [ids.pending]);
      assert.equal((await asUser("pending", "select member_number from public.profiles")).rows[0].member_number, number);
    },
  );

  const first = await slot("teacher", 3);
  const overlapping = await slot("teacher2", 3);
  let bookingId;

  await t.test("dashboard migration creates stable member codes and validates titled lessons", async () => {
    const codes = await superQuery("select member_code from public.profiles");
    assert.equal(new Set(codes.rows.map(row => row.member_code)).size, Object.keys(ids).length);
    assert.ok(codes.rows.every(row => /^ABVN-[A-F0-9]{12}$/.test(row.member_code)));
    const result = await asUser("teacher", `select public.create_calendar_slot(
      now()+interval '20 days',now()+interval '20 days 45 minutes',
      'https://meet.google.com/dashboard', '  Interview practice  ', 'Building confidence') as id`);
    const record = await superQuery("select title,description from public.lesson_slots where id=$1", [result.rows[0].id]);
    assert.deepEqual(record.rows[0], { title: "Interview practice", description: "Building confidence" });
    await assert.rejects(asUser("student", `select public.create_calendar_slot(now()+interval '21 days',now()+interval '21 days 1 hour','https://meet.google.com/dashboard','Title','')`), /approved teacher/);
    const before = (await superQuery("select count(*) as n from public.lesson_slots")).rows[0].n;
    await assert.rejects(asUser("teacher", `select public.create_calendar_slot(now()+interval '22 days',now()+interval '22 days 1 hour','https://meet.google.com/dashboard',' ','')`), /check constraint/);
    assert.equal((await superQuery("select count(*) as n from public.lesson_slots")).rows[0].n, before);
    await superQuery("delete from public.lesson_slots where id=$1", [result.rows[0].id]);
    await assert.rejects(asUser("student", "select * from public.dashboard_lessons(now(),now()+interval '94 days')"), /at most 93 days/);
    await assert.rejects(asUser("student", "select * from public.dashboard_lessons(now(),now())"), /at most 93 days/);
  });

  await t.test("new numbers follow approval order rather than signup, and failed transactions do not consume a number", async () => {
    await superQuery("begin");
    const firstApplicant = "00000000-0000-4000-8000-000000000007";
    const secondApplicant = "00000000-0000-4000-8000-000000000008";
    try {
      await superQuery(`insert into auth.users(id,email) values ($1,'first@example.test'),($2,'second@example.test')`, [firstApplicant, secondApplicant]);
      await superQuery("update public.profiles set requested_role='student' where id in ($1,$2)", [firstApplicant, secondApplicant]);
      await asUser("admin", "select public.review_member($1,'approved')", [secondApplicant]);
      assert.equal((await superQuery("select member_number from public.profiles where id=$1", [secondApplicant])).rows[0].member_number, 4);
      await superQuery("savepoint failed_approval");
      await assert.rejects(superQuery("update public.profiles set status='approved',role='student',full_name='' where id=$1", [firstApplicant]), /check constraint/);
      await db.exec("rollback to savepoint failed_approval");
      await asUser("admin", "select public.review_member($1,'approved')", [firstApplicant]);
      assert.equal((await superQuery("select member_number from public.profiles where id=$1", [firstApplicant])).rows[0].member_number, 5);
    } finally { await db.exec("rollback"); }
  });

  await t.test("calendar ranges are not truncated at 200 available lessons", async () => {
    await db.exec("reset role; begin");
    try {
      await superQuery(`insert into public.lesson_slots(teacher_id,starts_at,ends_at,meeting_url)
        select $1, date_trunc('day',now())+interval '31 days'+n*interval '1 hour',
        date_trunc('day',now())+interval '31 days'+n*interval '1 hour'+interval '30 minutes',
        'https://meet.google.com/calendar-test' from generate_series(0,200) n`, [ids.teacher2]);
      const result = await asUser("student", `select * from public.dashboard_lessons(
        date_trunc('day',now())+interval '31 days',
        date_trunc('day',now())+interval '40 days')`);
      assert.equal(result.rows.length, 201);
      assert.ok(result.rows.every(row => row.can_book && row.student_name === null && row.meeting_url === null));
      assert.equal((await asUser("student", `select * from public.dashboard_lessons(
        date_trunc('day',now())+interval '41 days',date_trunc('day',now())+interval '42 days')`)).rows.length, 0);
    } finally {
      await db.exec("rollback");
    }
  });

  await t.test(
    "only teachers publish slots; teacher overlaps and invalid links are rejected",
    async () => {
      await assert.rejects(slot("student", 4), /approved teacher/);
      await assert.rejects(slot("teacher", 3), /overlaps/);
      await assert.rejects(
        asUser(
          "teacher",
          "select public.create_lesson_slot(now()-interval '1 day', now(), 'https://meet.google.com/abc')",
        ),
        /future time/,
      );
      await assert.rejects(
        asUser(
          "teacher",
          "select public.create_lesson_slot(now()+interval '5 days',now()+interval '5 days 1 hour','javascript:alert(1)')",
        ),
        /check constraint/,
      );
    },
  );

  await t.test(
    "available listings exclude classroom links and private profiles",
    async () => {
      const result = await asUser(
        "student",
        "select * from public.available_lessons()",
      );
      assert.equal(result.rows.length, 2);
      assert.equal("meeting_url" in result.rows[0], false);
      assert.equal(
        (await asUser("student", "select * from public.lesson_slots")).rows
          .length,
        0,
      );
      assert.equal(
        (await asUser("student", "select * from public.profiles")).rows.length,
        1,
      );
    },
  );

  await t.test(
    "booking is atomic, exclusive, and checks student schedule conflicts",
    async () => {
      bookingId = (
        await asUser("student", "select public.book_lesson($1) as id", [first])
      ).rows[0].id;
      await assert.rejects(
        asUser("student2", "select public.book_lesson($1)", [first]),
        /no longer available/,
      );
      await assert.rejects(
        asUser("student", "select public.book_lesson($1)", [overlapping]),
        /already have a lesson/,
      );
      const lessons = await asUser(
        "student",
        "select * from public.my_lessons()",
      );
      assert.equal(
        lessons.rows[0].meeting_url,
        "https://meet.google.com/abc-defg-hij",
      );
      assert.equal(
        (await asUser("student2", "select * from public.my_lessons()")).rows
          .length,
        0,
      );
      const calendar = await asUser("student2", "select * from public.dashboard_lessons(now(),now()+interval '7 days')");
      assert.equal(calendar.rows.length, 1);
      assert.equal(calendar.rows[0].slot_id, overlapping);
      assert.equal(calendar.rows[0].can_book, true);
      assert.ok(calendar.rows.every(row => !row.meeting_url && !row.student_name && !row.student_code && !row.attendance && !row.teacher_comment && !row.student_comment));
      const own = (await asUser("student", "select * from public.dashboard_lessons(now(),now()+interval '7 days') where slot_id=$1", [first])).rows[0];
      assert.equal(own.student_name, "student");
      assert.equal(own.can_book, false);
      assert.equal(own.meeting_url, "https://meet.google.com/abc-defg-hij");
      const privateCode = own.student_code;
      assert.equal((await asUser("student2", "select * from public.member_profile($1)", [privateCode])).rows.length, 0);
      assert.equal((await asUser("teacher2", "select * from public.member_profile($1)", [privateCode])).rows.length, 0);
      const connected = (await asUser("teacher", "select * from public.member_profile($1)", [privateCode])).rows[0];
      assert.equal(connected.full_name, "student");
      assert.equal("email" in connected, false);
      assert.equal("id" in connected, false);
      assert.equal((await asUser("teacher", "select * from public.teacher_students()")).rows.length, 1);
      assert.equal((await asUser("teacher2", "select * from public.teacher_students()")).rows.length, 0);
      await assert.rejects(asUser("student2", "select * from public.teacher_students()"), /approved teacher/);
      await superQuery("select set_config('request.jwt.claim.sub', '', false)");
      await db.exec("set role anon");
      assert.equal((await db.query("select * from public.member_profile($1)", [own.teacher_code])).rows[0].full_name, "teacher");
      assert.equal((await db.query("select * from public.member_profile($1)", [privateCode])).rows.length, 0);
      await assert.rejects(db.query("select * from public.dashboard_lessons(now(),now()+interval '7 days')"), /permission denied/);
    },
  );

  await t.test("calendar details return numbers and authorize avatar reads without exposing unrelated students", async () => {
    await superQuery("begin");
    try {
      for (const name of ["teacher", "student", "student2"]) {
        const path = `${ids[name]}/profile.jpg`;
        await superQuery("update public.profiles set avatar_path=$1 where id=$2", [path, ids[name]]);
        await asUser(name, "insert into storage.objects(bucket_id,name) values ('avatars',$1)", [path]);
      }
      const calendar = (await asUser("teacher", "select * from public.dashboard_calendar(now(),now()+interval '7 days') where slot_id=$1", [first])).rows[0];
      assert.equal(calendar.teacher_number, 1);
      assert.equal(calendar.student_number, 1);
      assert.equal(calendar.student_avatar_path, `${ids.student}/profile.jpg`);
      const visible = async name => (await asUser(name, "select name from storage.objects order by name")).rows.map(row => row.name);
      assert.deepEqual(await visible("teacher"), [`${ids.teacher}/profile.jpg`, `${ids.student}/profile.jpg`]);
      assert.deepEqual(await visible("student2"), [`${ids.teacher}/profile.jpg`, `${ids.student2}/profile.jpg`]);
      assert.deepEqual(await visible("teacher2"), [`${ids.teacher}/profile.jpg`]);
      assert.equal((await visible("admin")).length, 3);
      const other = (await asUser("student2", "select * from public.dashboard_calendar(now(),now()+interval '7 days')")).rows;
      assert.ok(other.every(row => row.student_number === null && row.student_avatar_path === null && row.student_name === null));
      assert.equal((await asUser("student2", "delete from storage.objects where name=$1 returning name", [`${ids.student}/profile.jpg`])).rows.length, 0);
      await asUser("admin", "select public.review_member($1,'suspended')", [ids.teacher]);
      assert.deepEqual(await visible("teacher"), [`${ids.teacher}/profile.jpg`]);
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select * from public.dashboard_calendar(now(),now()+interval '7 days')"), /permission denied/);
    } finally { await db.exec("rollback"); }
  });

  await t.test(
    "cancellation checks ownership and releases the slot for rebooking",
    async () => {
      await assert.rejects(
        asUser("student2", "select public.cancel_lesson($1)", [first]),
        /not yours/,
      );
      await assert.rejects(
        asUser("teacher2", "select public.cancel_lesson($1)", [first]),
        /cannot cancel/,
      );
      await asUser("student", "select public.cancel_lesson($1)", [first]);
      const teacherLessons = await asUser(
        "teacher",
        "select * from public.my_lessons()",
      );
      assert.equal(teacherLessons.rows[0].slot_status, "available");
      assert.equal(teacherLessons.rows[0].booking_id, null);
      bookingId = (
        await asUser("student2", "select public.book_lesson($1) as id", [first])
      ).rows[0].id;
      const previous = await asUser(
        "student",
        "select * from public.my_lessons()",
      );
      assert.equal(previous.rows[0].booking_status, "cancelled");
      assert.equal(previous.rows[0].meeting_url, null);
      const audit = (await asUser("student", "select * from public.dashboard_lessons(now(),now()+interval '7 days') where slot_id=$1", [first])).rows;
      assert.equal(audit.length, 1);
      assert.equal(audit[0].booking_status, "cancelled");
      assert.equal(audit[0].student_name, "student");
      assert.equal(audit[0].meeting_url, null);
    },
  );

  await t.test("shared calendar reveals class identity but masks other participants' private class data", async () => {
    await superQuery("begin");
    try {
      await superQuery("update public.lesson_slots set title='Shared conversation',description='Private lesson description',status='completed' where id=$1", [first]);
      await superQuery("update public.bookings set status='completed',attendance='present' where id=$1", [bookingId]);
      await superQuery(`insert into public.lesson_feedback(booking_id,author_id,author_role,comment,rating) values
        ($1,$2,'teacher','Private teacher feedback',null),($1,$3,'student','Private student feedback',null)`,
      [bookingId, ids.teacher, ids.student2]);

      const shared = (await asUser("student", `select * from public.dashboard_shared_calendar(
        now(),now()+interval '7 days') where slot_id=$1`, [first])).rows[0];
      assert.equal(shared.is_my_class, false);
      assert.equal(shared.teacher_name, "teacher");
      assert.equal(shared.student_name, "student2");
      assert.equal(shared.student_number, 2);
      assert.equal(shared.title, "Shared conversation");
      assert.equal(shared.description, "");
      assert.equal(shared.slot_status, null);
      assert.equal(shared.booking_id, null);
      assert.equal(shared.booking_status, null);
      assert.equal(shared.attendance, null);
      assert.equal(shared.teacher_comment, null);
      assert.equal(shared.student_comment, null);
      assert.equal(shared.meeting_url, null);
      assert.equal(shared.student_code, null);
      assert.equal(shared.student_avatar_path, null);

      const otherTeacher = (await asUser("teacher2", `select * from public.dashboard_shared_calendar(
        now(),now()+interval '7 days') where slot_id=$1`, [first])).rows[0];
      assert.equal(otherTeacher.is_my_class, false);
      assert.equal(otherTeacher.teacher_name, "teacher");
      assert.equal(otherTeacher.student_name, "student2");
      assert.equal(otherTeacher.student_number, 2);
      assert.equal(otherTeacher.title, "Shared conversation");
      assert.equal(otherTeacher.slot_status, null);
      assert.equal(otherTeacher.attendance, null);
      assert.equal(otherTeacher.teacher_comment, null);
      assert.equal(otherTeacher.meeting_url, null);
      assert.equal(otherTeacher.teacher_avatar_path, null);

      const own = (await asUser("student2", `select * from public.dashboard_shared_calendar(
        now(),now()+interval '7 days') where slot_id=$1`, [first])).rows[0];
      assert.equal(own.is_my_class, true);
      assert.equal(own.booking_id, bookingId);
      assert.equal(own.booking_status, "completed");
      assert.equal(own.attendance, "present");
      assert.equal(own.teacher_comment, "Private teacher feedback");
      assert.equal(own.student_comment, "Private student feedback");

      const otherOpen = await slot("teacher", 4);
      const otherAvailable = (await asUser("student", `select * from public.dashboard_shared_calendar(
        now(),now()+interval '7 days') where slot_id=$1`, [otherOpen])).rows[0];
      assert.equal(otherAvailable.is_my_class, false);
      assert.equal(otherAvailable.can_book, true);
      assert.equal(otherAvailable.slot_status, "available");
      const teacherAvailable = (await asUser("teacher2", `select * from public.dashboard_shared_calendar(
        now(),now()+interval '7 days') where slot_id=$1`, [otherOpen])).rows[0];
      assert.equal(teacherAvailable.is_my_class, false);
      assert.equal(teacherAvailable.slot_status, null);
      assert.equal(teacherAvailable.can_book, false);
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select * from public.dashboard_shared_calendar(now(),now()+interval '1 day')"), /permission denied/);
    } finally { await db.exec("rollback"); }
  });

  await t.test("cancelling a never-booked slot deletes it, but booked cancellations retain history", async () => {
    const unbooked = await slot("teacher", 25);
    await asUser("teacher", "select public.cancel_lesson($1)", [unbooked]);
    assert.equal((await superQuery("select count(*) as n from public.lesson_slots where id=$1", [unbooked])).rows[0].n, 0);
    assert.equal((await asUser("student", "select * from public.dashboard_shared_calendar(now(),now()+interval '30 days') where slot_id=$1", [unbooked])).rows.length, 0);

    const previouslyBooked = await slot("teacher", 26);
    const pastBooking = (await asUser("student2", "select public.book_lesson($1) as id", [previouslyBooked])).rows[0].id;
    await asUser("student2", "select public.cancel_lesson($1)", [previouslyBooked]);
    await asUser("teacher", "select public.cancel_lesson($1)", [previouslyBooked]);
    assert.equal((await superQuery("select status from public.lesson_slots where id=$1", [previouslyBooked])).rows[0].status, "cancelled");
    assert.equal((await superQuery("select status from public.bookings where id=$1", [pastBooking])).rows[0].status, "cancelled");
  });

  await t.test(
    "students cannot cancel within 12 hours; admins can resolve urgent lessons",
    async () => {
      const id = (
        await asUser(
          "teacher",
          "select public.create_lesson_slot(now()+interval '6 hours',now()+interval '7 hours','https://meet.google.com/urgent') as id",
        )
      ).rows[0].id;
      await asUser("student", "select public.book_lesson($1)", [id]);
      await assert.rejects(
        asUser("student", "select public.cancel_lesson($1)", [id]),
        /12 hours/,
      );
      await asUser("admin", "select public.cancel_lesson($1)", [id]);
      assert.equal(
        (
          await asUser(
            "student",
            "select * from public.my_lessons() where slot_id=$1",
            [id],
          )
        ).rows[0].booking_status,
        "cancelled",
      );
    },
  );

  await t.test(
    "the cancellation boundary is strictly more than 12 hours",
    async () => {
      for (const [seconds, allowed] of [
        [43200, false],
        [43201, true],
      ]) {
        await db.exec("reset role; begin;");
        try {
          const id = (
            await asUser(
              "teacher",
              `select public.create_lesson_slot(
          now() + $1 * interval '1 second',
          now() + $1 * interval '1 second' + interval '1 hour',
          'https://meet.google.com/boundary') as id`,
              [seconds],
            )
          ).rows[0].id;
          await asUser("student", "select public.book_lesson($1)", [id]);
          if (allowed) {
            await asUser("student", "select public.cancel_lesson($1)", [id]);
          } else {
            await assert.rejects(
              asUser("student", "select public.cancel_lesson($1)", [id]),
              /12 hours/,
            );
          }
        } finally {
          await db.exec("rollback;");
        }
      }
    },
  );

  await t.test(
    "written feedback checks time, participation, text and attendance without requiring a rating",
    async () => {
      await assert.rejects(
        asUser(
          "student2",
          "select public.submit_written_feedback($1,'Thanks',null)",
          [bookingId],
        ),
        /after.*ends/,
      );
      await superQuery(
        "update public.lesson_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",
        [first],
      );
      await superQuery(
        "update public.bookings set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",
        [bookingId],
      );
      await assert.rejects(
        asUser(
          "student",
          "select public.submit_lesson_feedback($1,'Intruder',5,null)",
          [bookingId],
        ),
        /Only the lesson participants/,
      );
      await assert.rejects(
        asUser(
          "student2",
          "select public.submit_lesson_feedback($1,'Thanks',6,null)",
          [bookingId],
        ),
        /written feedback only/,
      );
      await asUser(
        "teacher",
        "select public.submit_written_feedback($1,'Excellent speaking progress','present')",
        [bookingId],
      );
      await asUser(
        "student2",
        "select public.submit_written_feedback($1,'Thank you!',null)",
        [bookingId],
      );
      await superQuery("update public.lesson_feedback set rating=4 where booking_id=$1 and author_role='student'", [bookingId]);
      await asUser(
        "student2",
        "select public.submit_written_feedback($1,'Updated thank you!',null)",
        [bookingId],
      );
      const lesson = (
        await asUser(
          "student2",
          "select * from public.my_lessons() where booking_id=$1",
          [bookingId],
        )
      ).rows[0];
      assert.equal(lesson.attendance, "present");
      assert.equal(lesson.booking_status, "completed");
      assert.equal(lesson.teacher_comment, "Excellent speaking progress");
      assert.equal(lesson.student_rating, null);
      await assert.rejects(asUser("student2", "select public.submit_written_feedback($1,'',null)", [bookingId]), /check constraint/);
      await assert.rejects(asUser("student2", "select public.submit_written_feedback($1,$2,null)", [bookingId, "x".repeat(2001)]), /check constraint/);
      await assert.rejects(asUser("student2", "select public.submit_written_feedback($1,'Cannot set attendance','present')", [bookingId]), /written feedback only/);
      await assert.rejects(asUser("admin", "select public.submit_written_feedback($1,'Not a participant',null)", [bookingId]), /Only the lesson participants/);
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select public.submit_written_feedback($1,'Anonymous',null)", [bookingId]), /permission denied/);
      const audit = (await asUser("student2", "select * from public.dashboard_lessons(now()-interval '1 day',now()) where slot_id=$1", [first])).rows[0];
      assert.equal(audit.student_comment, "Updated thank you!");
      assert.equal(audit.teacher_comment, "Excellent speaking progress");
      assert.equal((await asUser("student", "select * from public.dashboard_lessons(now()-interval '1 day',now()) where slot_id=$1", [first])).rows[0].student_comment, null);
      assert.equal(
        (
          await superQuery(
            "select * from public.lesson_feedback where booking_id=$1",
            [bookingId],
          )
        ).rows.length,
        2,
      );
    },
  );

  await t.test(
    "suspended accounts lose RPC access and teacher classroom row access",
    async () => {
      await asUser("admin", "select public.review_member($1,'suspended')", [
        ids.teacher,
      ]);
      await assert.rejects(
        asUser("teacher", "select * from public.my_lessons()"),
        /approved account/,
      );
      await assert.rejects(asUser("teacher", "select * from public.dashboard_lessons(now(),now()+interval '1 day')"), /approved account/);
      assert.equal((await asUser("teacher", "select * from public.lesson_slots")).rows.length, 0);
      const listing = await asUser("student", "select * from public.available_lessons()");
      assert.ok(listing.rows.every((row) => row.teacher_id !== ids.teacher));
      await asUser("admin", "select public.review_member($1,'approved')", [ids.teacher]);
    },
  );

  await t.test("participant time zones follow authorized lesson access without leaking other students", async () => {
    await superQuery("begin");
    try {
      await superQuery("update public.profiles set time_zone='America/New_York' where id=$1", [ids.teacher]);
      await superQuery("update public.profiles set time_zone='Asia/Kolkata' where id=$1", [ids.student2]);
      const details = (await asUser("student2", "select * from public.dashboard_calendar_details(now()-interval '1 day',now()) where booking_id=$1", [bookingId])).rows[0];
      assert.equal(details.teacher_time_zone, "America/New_York");
      assert.equal(details.student_time_zone, "Asia/Kolkata");
      const unrelated = (await asUser("student", "select * from public.dashboard_calendar_details(now()-interval '1 day',now()) where slot_id=$1", [first])).rows;
      assert.ok(unrelated.every(row => row.student_time_zone !== "Asia/Kolkata" && row.student_name !== "student2"));
      assert.equal((await asUser("teacher", "select * from public.dashboard_calendar_details(now()-interval '1 day',now()) where booking_id=$1", [bookingId])).rows[0].student_time_zone, "Asia/Kolkata");
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select * from public.dashboard_calendar_details(now(),now()+interval '1 day')"), /permission denied/);
    } finally { await db.exec("rollback"); }
  });

  await t.test("teacher attendance supports apologies and teacher-side cancellation atomically without penalties or reopening", async () => {
    await superQuery("begin");
    async function rejected(operation, pattern) {
      await db.exec("savepoint expected_error");
      try { await assert.rejects(operation(), pattern); }
      finally { await db.exec("rollback to savepoint expected_error"); }
    }
    try {
      const before = (await superQuery("select status,participation_status from public.profiles where id=$1", [ids.student2])).rows[0];
      await rejected(() => asUser("teacher2", "select public.submit_lesson_feedback($1,'Not my lesson',null,'cancelled')", [bookingId]), /Only the lesson participants/);
      await rejected(() => asUser("student2", "select public.submit_lesson_feedback($1,'Not permitted',5,'cancelled')", [bookingId]), /written feedback only/);
      for (const value of ["present", "absent", "apologized"]) {
        await asUser("teacher", "select public.submit_lesson_feedback($1,'Attendance updated',null,$2)", [bookingId, value]);
        assert.equal((await superQuery("select attendance from public.bookings where id=$1", [bookingId])).rows[0].attendance, value);
      }
      await rejected(() => asUser("teacher", "select public.submit_lesson_feedback($1,'',null,'cancelled')", [bookingId]), /check constraint/);
      assert.equal((await superQuery("select status from public.bookings where id=$1", [bookingId])).rows[0].status, "completed");
      const beforeCount = (await superQuery("select count(*)::integer as n from public.bookings where student_id=$1 and status<>'cancelled'", [ids.student2])).rows[0].n;
      await asUser("teacher", "select public.submit_lesson_feedback($1,'Teacher missed the lesson; restore class allowance.',null,'cancelled')", [bookingId]);
      const booking = (await superQuery("select * from public.bookings where id=$1", [bookingId])).rows[0];
      assert.equal(booking.attendance, "cancelled");
      assert.equal(booking.status, "cancelled");
      assert.equal((await superQuery("select status from public.lesson_slots where id=$1", [first])).rows[0].status, "cancelled");
      assert.equal((await superQuery("select count(*)::integer as n from public.bookings where student_id=$1 and status<>'cancelled'", [ids.student2])).rows[0].n, beforeCount - 1);
      const history = (await asUser("student2", "select * from public.dashboard_calendar_details(now()-interval '1 day',now()) where booking_id=$1", [bookingId])).rows[0];
      assert.equal(history.attendance, "cancelled");
      assert.equal(history.teacher_comment, "Teacher missed the lesson; restore class allowance.");
      assert.equal(history.can_book, false);
      assert.deepEqual((await superQuery("select status,participation_status from public.profiles where id=$1", [ids.student2])).rows[0], before);
      const futureSlot = await slot("teacher", 170, 4);
      const futureBooking = (await asUser("student2", "select public.book_lesson($1) as id", [futureSlot])).rows[0].id;
      await assert.rejects(asUser("teacher", "select public.submit_lesson_feedback($1,'Too early',null,'cancelled')", [futureBooking]), /after.*ends/);
    } finally { await db.exec("rollback"); }
  });

  async function manage(name, participation, overrides = {}) {
    const current = (await superQuery("select * from public.profiles where id=$1", [ids[name]])).rows[0];
    const fields = {
      name: current.full_name, country: current.country, bio: current.bio,
      zone: current.time_zone, focus: current.teaching_focus, hobbies: current.hobbies,
      proficiency: current.proficiency, ...overrides,
    };
    return asUser("admin", "select public.admin_save_member($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      ids[name], fields.name, fields.country, fields.bio, fields.zone,
      fields.focus, fields.hobbies, fields.proficiency, participation,
    ]);
  }

  await t.test("only admins edit member profiles; protected identity and membership fields are preserved", async () => {
    const before = (await superQuery("select * from public.profiles where id=$1", [ids.student])).rows[0];
    const args = [ids.student, "Edited student", "Vietnam", "Updated biography", "Asia/Ho_Chi_Minh", "Conversation", "Reading", "B1", "active"];
    await assert.rejects(asUser("teacher", "select public.admin_save_member($1,$2,$3,$4,$5,$6,$7,$8,$9)", args), /approved admin/);
    await assert.rejects(asUser("student", "select public.admin_save_member($1,$2,$3,$4,$5,$6,$7,$8,$9)", args), /approved admin/);
    await asUser("admin", "select public.admin_save_member($1,$2,$3,$4,$5,$6,$7,$8,$9)", args);
    const after = (await superQuery("select * from public.profiles where id=$1", [ids.student])).rows[0];
    for (const field of ["id", "email", "role", "requested_role", "status", "member_code", "member_number", "avatar_path"]) assert.equal(after[field], before[field], field);
    assert.equal(after.full_name, "Edited student");
    assert.equal(after.bio, "Updated biography");
    assert.equal(after.proficiency, "B1");
    for (const patch of [{ name: "" }, { country: "x".repeat(101) }, { bio: "x".repeat(4001) }, { zone: "Mars/Unknown" }, { focus: "x".repeat(501) }, { hobbies: "x".repeat(501) }, { proficiency: "Z9" }]) {
      await assert.rejects(manage("student", "active", patch), /Check the profile/);
    }
    await assert.rejects(manage("teacher", "banned"), /valid teaching or study status/);
    await assert.rejects(manage("student", "guest"), /valid teaching or study status/);
    await assert.rejects(manage("student", null), /valid teaching or study status/);
    await assert.rejects(manage("admin", "active"), /cannot be edited/);
    await asUser("admin", "select public.admin_save_member($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      before.id, before.full_name, before.country, before.bio, before.time_zone,
      before.teaching_focus, before.hobbies, before.proficiency, "active",
    ]);
    await assert.rejects(asUser("student", "update public.profiles set participation_status='active'"), /permission denied/);
  });

  await t.test("inactive teachers are hidden publicly and reactivate only after successfully publishing; guests stay guests", async () => {
    await slot("teacher", 2, 2);
    await manage("teacher", "inactive");
    await db.exec("reset role; set role anon;");
    let directory = (await db.query("select * from public.public_teacher_directory()")).rows;
    const code = (await superQuery("select member_code from public.profiles where id=$1", [ids.teacher])).rows[0].member_code;
    assert.ok(!directory.some(row => row.member_code === code));
    assert.ok((await asUser("teacher", "select * from public.my_lessons()")).rows.length > 0);
    assert.ok((await asUser("student", "select * from public.available_lessons()")).rows.some(row => row.teacher_id === ids.teacher));
    await assert.rejects(asUser("teacher", `select public.create_calendar_slot(now()+interval '160 days',now()+interval '160 days 1 hour','https://meet.google.com/status',$1,'')`, ["x".repeat(121)]), /check constraint/);
    assert.equal((await superQuery("select participation_status from public.profiles where id=$1", [ids.teacher])).rows[0].participation_status, "inactive");
    await slot("teacher", 160, 3);
    assert.equal((await superQuery("select participation_status from public.profiles where id=$1", [ids.teacher])).rows[0].participation_status, "active");
    directory = (await asUser("student", "select * from public.public_teacher_directory()")).rows;
    assert.ok(directory.some(row => row.member_code === code));
    assert.ok(directory.every(row => !("email" in row) && !("time_zone" in row)));
    await manage("teacher", "guest");
    await slot("teacher", 161, 3);
    assert.equal((await superQuery("select participation_status from public.profiles where id=$1", [ids.teacher])).rows[0].participation_status, "guest");
    assert.equal((await asUser("student", "select * from public.public_teacher_directory() where member_code=$1", [code])).rows[0].participation_status, "guest");
    await manage("teacher", "active");
  });

  await t.test("anonymous directory photo access includes only current photos of approved visible teachers", async () => {
    await superQuery("begin");
    try {
      for (const name of ["teacher", "student"]) {
        const path = `${ids[name]}/profile.jpg`;
        await superQuery("update public.profiles set avatar_path=$1 where id=$2", [path, ids[name]]);
        await superQuery("insert into storage.objects(bucket_id,name) values ('avatars',$1)", [path]);
      }
      const photo = `${ids.teacher}/profile.jpg`;
      const anonymousPhotos = async () => {
        await db.exec("reset role; set role anon;");
        return (await db.query("select name from storage.objects")).rows.map(row => row.name);
      };
      assert.deepEqual(await anonymousPhotos(), [photo]);
      await manage("teacher", "inactive");
      assert.ok(!(await anonymousPhotos()).includes(photo));
      await manage("teacher", "guest");
      assert.ok((await anonymousPhotos()).includes(photo));
      await asUser("admin", "select public.review_member($1,'suspended')", [ids.teacher]);
      assert.ok(!(await anonymousPhotos()).includes(photo));
    } finally { await db.exec("rollback"); }
  });

  await t.test("inactive, banned and suspended study statuses enforce read-only history across calendar, legacy RPCs and bookings", async () => {
    const future = await slot("teacher", 150, 2);
    await asUser("student2", "select public.book_lesson($1)", [future]);
    const open = await slot("teacher", 151, 2);
    for (const status of ["inactive", "banned", "suspended"]) {
      await manage("student2", status);
      await asUser("admin", "select public.review_member($1,'approved')", [ids.student2]);
      assert.equal((await superQuery("select participation_status from public.profiles where id=$1", [ids.student2])).rows[0].participation_status, status);
      const history = (await asUser("student2", "select * from public.my_lessons()")).rows;
      assert.ok(history.some(row => row.booking_id === bookingId));
      assert.ok(history.every(row => new Date(row.ends_at) <= new Date() && row.meeting_url === null));
      assert.equal((await asUser("student2", "select * from public.dashboard_calendar(now(),now()+interval '90 days')")).rows.length, 0);
      const calendarHistory = (await asUser("student2", "select * from public.dashboard_calendar(now()-interval '1 day',now())")).rows;
      assert.ok(calendarHistory.some(row => row.booking_id === bookingId));
      assert.ok(calendarHistory.every(row => !row.can_book && row.meeting_url === null));
      assert.equal((await asUser("student2", "select * from public.bookings where slot_id=$1", [future])).rows.length, 0);
      await assert.rejects(asUser("student2", "select * from public.available_lessons()"), /read-only history/);
      await assert.rejects(asUser("student2", "select public.book_lesson($1)", [open]), /read-only history/);
      await assert.rejects(asUser("student2", "select public.cancel_lesson($1)", [future]), /read-only history/);
      await assert.rejects(asUser("student2", "select public.submit_lesson_feedback($1,'Should not save',5,null)", [bookingId]), /read-only history/);
      await assert.rejects(asUser("student2", "select public.submit_written_feedback($1,'Should not save',null)", [bookingId]), /read-only history/);
      await assert.rejects(asUser("student2", "select * from public.dashboard_shared_calendar(now()-interval '1 day',now()+interval '1 day')"), /read-only history/);
      for (const query of ["select public.member_book_lesson($1)", "select public.member_cancel_lesson($1)"]) await assert.rejects(asUser("student2", query, [open]), /permission denied/);
      await assert.rejects(asUser("student2", "select * from public.member_my_lessons()"), /permission denied/);
      await assert.rejects(asUser("student2", "select * from public.member_dashboard_lessons(now(),now()+interval '1 day')"), /permission denied/);
      assert.equal((await superQuery("select status from public.lesson_slots where id=$1", [future])).rows[0].status, "booked");
    }
    await manage("student2", "active");
    assert.ok((await asUser("student2", "select * from public.my_lessons()")).rows.some(row => row.slot_id === future));
    await asUser("student2", "select public.book_lesson($1)", [open]);
    await asUser("admin", "select public.cancel_lesson($1)", [future]);
    await asUser("admin", "select public.cancel_lesson($1)", [open]);
  });

  await t.test(
    "profile updates cannot change roles and validate timezone and avatar ownership",
    async () => {
      await assert.rejects(
        asUser(
          "student",
          "select public.save_profile('Student','','','Mars/Unknown','','','',null)",
        ),
        /valid IANA/,
      );
      await assert.rejects(
        asUser(
          "student",
          "select public.save_profile('Student','','','Asia/Ho_Chi_Minh','','','',$1)",
          [`${ids.teacher}/image.jpg`],
        ),
        /belong to your account/,
      );
      await asUser(
        "student",
        "select public.save_profile('Student','','New bio','Asia/Ho_Chi_Minh','Speaking','Reading','B1',null)",
      );
      assert.equal(
        (await asUser("student", "select role from public.profiles")).rows[0]
          .role,
        "student",
      );
    },
  );

  await t.test(
    "storage rows are private to their owner and public callers cannot invoke platform RPCs",
    async () => {
      await asUser(
        "teacher",
        "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
        [`${ids.teacher}/photo.jpg`],
      );
      assert.equal(
        (await asUser("student", "select * from storage.objects")).rows.length,
        0,
      );
      await assert.rejects(
        asUser(
          "student",
          "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
          [`${ids.teacher}/other.jpg`],
        ),
        /row-level security/,
      );
      await db.exec("reset role; set role anon;");
      await assert.rejects(
        db.query("select * from public.available_lessons()"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.profiles"),
        /permission denied/,
      );
      await db.exec("reset role;");
    },
  );

  await superQuery("select 1");
  await db.exec(await readFile(new URL("../supabase/migrations/202610210007_shared_class_details.sql", import.meta.url), "utf8"));

  await t.test("shared class upgrade exposes descriptions, photos and times but only upcoming availability for other classes", async () => {
    await superQuery("begin");
    try {
      const sharedSlot = await slot("teacher", 60);
      const openSlot = await slot("teacher", 61);
      const sharedBooking = (await asUser("student2", "select public.book_lesson($1) as id", [sharedSlot])).rows[0].id;
      await superQuery("update public.lesson_slots set title='Shared speaking practice',description='Discuss favourite hobbies together.' where id=$1", [sharedSlot]);
      for (const [name, zone] of [["teacher", "America/New_York"], ["student2", "Asia/Ho_Chi_Minh"]]) {
        await superQuery("update public.profiles set avatar_path=$1,time_zone=$2 where id=$3", [`${ids[name]}/calendar.jpg`, zone, ids[name]]);
      }
      const read = async (name, id = sharedSlot) => (await asUser(name, `select * from public.dashboard_shared_calendar(
        now()-interval '1 day',now()+interval '62 days') where slot_id=$1`, [id])).rows[0];
      for (const name of ["student", "teacher2"]) {
        const row = await read(name);
        assert.equal(row.is_my_class, false);
        assert.equal(row.slot_status, "booked");
        assert.equal(row.title, "Shared speaking practice");
        assert.equal(row.description, "Discuss favourite hobbies together.");
        assert.equal(row.teacher_avatar_path, `${ids.teacher}/calendar.jpg`);
        assert.equal(row.student_avatar_path, `${ids.student2}/calendar.jpg`);
        assert.equal(row.teacher_time_zone, "America/New_York");
        assert.equal(row.student_time_zone, "Asia/Ho_Chi_Minh");
        for (const field of ["booking_id", "booking_status", "attendance", "teacher_comment", "student_comment", "student_rating", "meeting_url", "student_code"]) {
          assert.equal(row[field], null, `${name}: ${field} stays private`);
        }
        const open = await read(name, openSlot);
        assert.equal(open.slot_status, "available");
        assert.equal(open.can_book, name === "student");
      }
      await superQuery("update public.lesson_slots set starts_at=now()-interval '6 hours',ends_at=now()-interval '5 hours',status='completed' where id=$1", [sharedSlot]);
      await superQuery("update public.bookings set starts_at=now()-interval '6 hours',ends_at=now()-interval '5 hours',status='completed',attendance='apologized' where id=$1", [sharedBooking]);
      await superQuery(`insert into public.lesson_feedback(booking_id,author_id,author_role,comment)
        values ($1,$2,'teacher','Private teacher feedback'),($1,$3,'student','Private student feedback')`, [sharedBooking, ids.teacher, ids.student2]);
      for (const name of ["student", "teacher2"]) {
        const past = await read(name);
        for (const field of ["slot_status", "booking_status", "attendance", "teacher_comment", "student_comment", "student_rating", "meeting_url", "student_code"]) {
          assert.equal(past[field], null, `${name}: past ${field} stays private`);
        }
        assert.equal(past.description, "Discuss favourite hobbies together.");
        assert.equal(past.student_avatar_path, `${ids.student2}/calendar.jpg`);
        assert.equal((await asUser(name, "select * from public.member_profile($1)", [(await read("student2")).student_code])).rows.length, 0);
      }
      for (const name of ["teacher", "student2", "admin"]) {
        const own = await read(name);
        assert.equal(own.is_my_class, true);
        assert.equal(own.slot_status, "completed");
        assert.equal(own.attendance, "apologized");
        assert.equal(own.teacher_comment, "Private teacher feedback");
        assert.equal(own.student_comment, "Private student feedback");
      }
      await superQuery("update public.lesson_slots set status='cancelled' where id=$1", [sharedSlot]);
      await superQuery("update public.bookings set status='cancelled' where id=$1", [sharedBooking]);
      assert.equal((await read("student")).slot_status, null);
      assert.equal((await read("admin")).slot_status, "cancelled");
      await superQuery("update public.profiles set status='pending' where id=$1", [ids.pending]);
      await assert.rejects(asUser("pending", "select * from public.dashboard_shared_calendar(now(),now()+interval '1 day')"), /approved account/);
    } finally { await db.exec("rollback"); }
  });

  await t.test("shared detail upgrade preserves calendar date bounds and anonymous denial", async () => {
    await assert.rejects(asUser("student", "select * from public.dashboard_shared_calendar(now(),now()+interval '94 days')"), /at most 93 days/);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.dashboard_shared_calendar(now(),now()+interval '1 day')"), /permission denied/);
  });

  await t.test("shared calendar photos are current, member-only and do not grant profile or arbitrary file access", async () => {
    await superQuery("begin");
    try {
      const sharedSlot = await slot("teacher", 60);
      await asUser("student2", "select public.book_lesson($1)", [sharedSlot]);
      const path = `${ids.student2}/shared.jpg`;
      const oldPath = `${ids.student2}/old.jpg`;
      await superQuery("update public.profiles set avatar_path=$1 where id=$2", [path, ids.student2]);
      await superQuery("insert into storage.objects(bucket_id,name) values ('avatars',$1),('avatars',$2)", [path, oldPath]);
      const visible = async name => (await asUser(name, "select name from storage.objects where name in ($1,$2) order by name", [path, oldPath])).rows.map(row => row.name);
      for (const name of ["student", "teacher2"]) assert.deepEqual(await visible(name), [path]);
      await asUser("student", "delete from storage.objects where name=$1", [path]);
      assert.equal((await superQuery("select count(*) as n from storage.objects where name=$1", [path])).rows[0].n, 1);
      await superQuery("update public.profiles set status='pending' where id=$1", [ids.pending]);
      assert.deepEqual(await visible("pending"), []);
      await manage("student", "inactive");
      assert.deepEqual(await visible("student"), []);
      await db.exec("savepoint restricted_calendar");
      await assert.rejects(asUser("student", "select * from public.dashboard_shared_calendar(now(),now()+interval '1 day')"), /read-only history/);
      await db.exec("rollback to savepoint restricted_calendar");
      await asUser("admin", "select public.review_member($1,'suspended')", [ids.teacher2]);
      assert.deepEqual(await visible("teacher2"), []);
      await db.exec("reset role; set role anon");
      assert.equal((await db.query("select name from storage.objects where name in ($1,$2)", [path, oldPath])).rows.length, 0);
      await assert.rejects(db.query("select public.can_read_calendar_avatar($1)", [path]), /permission denied/);
    } finally { await db.exec("rollback"); }
  });
  await superQuery("select 1");
  await db.exec(await readFile(new URL("../supabase/migrations/202610210008_web_content.sql", import.meta.url), "utf8"));

  await t.test("CMS upgrade preserves existing pages, seeds news and keeps draft/version data admin-only", async () => {
    for (const key of ["home","about","news"]) {
      assert.deepEqual((await asUser("student", "select public.public_content($1) as body", [key])).rows[0].body, defaultContent(key));
    }
    assert.equal((await asUser("student", "select * from public.content_documents")).rows.length, 0);
    assert.equal((await asUser("teacher", "select * from public.content_revisions")).rows.length, 0);
    assert.equal((await asUser("admin", "select * from public.content_documents")).rows.length, 3);
    await assert.rejects(asUser("student", "select public.admin_write_content('home',$1,1,false)", [defaultContent("home")]), /approved admin/);
    await assert.rejects(asUser("teacher", "update public.content_documents set version=99"), /permission denied/);
    await db.exec("reset role; set role anon");
    assert.ok((await db.query("select public.public_content('home') as body")).rows[0].body.fields);
    await assert.rejects(db.query("select * from public.content_documents"), /permission denied/);
  });

  await t.test("draft saves do not publish; publish and restore record actor/time and reject stale edits", async () => {
    const home = defaultContent("home");
    home.fields["home-001"] = "10";
    home.sections.reverse();
    assert.equal((await asUser("admin", "select public.admin_write_content('home',$1,1,false) as version", [home])).rows[0].version, 2);
    assert.notDeepEqual((await asUser("student", "select public.public_content('home') as body")).rows[0].body, home);
    await assert.rejects(asUser("admin", "select public.admin_write_content('home',$1,1,true)", [home]), /Another admin/);
    await asUser("admin", "select public.admin_write_content('home',$1,2,true)", [home]);
    assert.deepEqual((await asUser("student", "select public.public_content('home') as body")).rows[0].body, home);
    const revision = (await asUser("admin", "select * from public.content_revisions where key='home' order by id desc limit 1")).rows[0];
    assert.equal(revision.publisher_id, ids.admin);
    assert.equal(revision.publisher_name, "admin");
    assert.ok(revision.published_at);
    await asUser("admin", "select public.admin_write_content('home',$1,3,true)", [defaultContent("home")]);
    assert.deepEqual((await asUser("student", "select public.public_content('home') as body")).rows[0].body, defaultContent("home"));
    assert.equal((await asUser("admin", "select count(*) as n from public.content_revisions where key='home'")).rows[0].n, 3);
  });

  await t.test("news drafts and archives are not returned publicly and publishing supports new articles and removals", async () => {
    const news = defaultContent("news");
    news.articles[0].status="draft";
    news.articles[1].status="archived";
    const added={...news.articles[2],slug:"new-published-story",title:"New story",date:"2026-10-21"};
    news.articles.push(added);
    await asUser("admin", "select public.admin_write_content('news',$1,1,true)", [news]);
    const articles=(await asUser("student", "select public.public_content('news') as body")).rows[0].body.articles;
    assert.equal(articles[0].slug,added.slug);
    assert.ok(!articles.some(item => item.slug===news.articles[0].slug || item.slug===news.articles[1].slug));
    news.articles = news.articles.filter(item => item.slug !== added.slug);
    await asUser("admin","select public.admin_write_content('news',$1,2,true)",[news]);
    assert.ok(!(await asUser("student", "select public.public_content('news') as body")).rows[0].body.articles.some(item=>item.slug===added.slug));
  });

  await t.test("direct CMS RPC calls reject unsafe images, links, missing fields, duplicate slugs and missing media", async () => {
    const page=defaultContent("about");
    page.fields["about-001"]="";
    await assert.rejects(asUser("admin","select public.admin_write_content('about',$1,1,true)",[page]),/required/);
    const news=defaultContent("news");
    news.articles[0].image="javascript:alert(1)";
    await assert.rejects(asUser("admin","select public.admin_write_content('news',$1,3,true)",[news]),/image/);
    news.articles[0].image="/api/content-media/00000000-0000-4000-8000-000000000099.png";
    await assert.rejects(asUser("admin","select public.admin_write_content('news',$1,3,true)",[news]),/missing/);
    news.articles[0].image="/images/volunteer-team.jpg";
    news.articles[1].slug=news.articles[0].slug;
    await assert.rejects(asUser("admin","select public.admin_write_content('news',$1,3,true)",[news]),/unique/);
  });

  await t.test("draft media remains private, only published article images become public and historical images cannot be deleted", async () => {
    const name="00000000-0000-4000-8000-000000000099.png";
    await assert.rejects(asUser("student","insert into storage.objects(bucket_id,name) values ('web-content',$1)",[name]),/row-level security/);
    await asUser("admin","insert into storage.objects(bucket_id,name) values ('web-content',$1)",[name]);
    const visible=async(role)=> {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await db.exec("set role "+role);
      return (await db.query("select name from storage.objects where bucket_id='web-content'")).rows.map(item=>item.name);
    };
    assert.deepEqual(await visible("anon"),[]);
    const news=defaultContent("news");
    news.articles[0].image=`/api/content-media/${name}`;
    news.articles[0].status="draft";
    await asUser("admin","select public.admin_write_content('news',$1,3,true)",[news]);
    assert.deepEqual(await visible("anon"),[]);
    news.articles[0].status="published";
    await asUser("admin","select public.admin_write_content('news',$1,4,false)",[news]);
    assert.deepEqual(await visible("anon"),[]);
    await asUser("admin","select public.admin_write_content('news',$1,5,true)",[news]);
    assert.deepEqual(await visible("anon"),[name]);
    assert.equal((await asUser("admin","delete from storage.objects where bucket_id='web-content' returning name")).rows.length,0);
    await asUser("admin","select public.admin_write_content('news',$1,6,true)",[defaultContent("news")]);
    assert.deepEqual(await visible("anon"),[]);
    assert.equal((await asUser("admin","delete from storage.objects where bucket_id='web-content' returning name")).rows.length,0);
    const unused="00000000-0000-4000-8000-000000000098.png";
    await asUser("admin","insert into storage.objects(bucket_id,name) values ('web-content',$1)",[unused]);
    assert.deepEqual((await asUser("admin","delete from storage.objects where bucket_id='web-content' returning name")).rows,[{ name: unused }]);
  });

  await t.test("news editor migration preserves text and historical content while converting private draft visibility", async () => {
    const draft=(await asUser("admin","select draft from public.content_documents where key='news'")).rows[0].draft;
    draft.articles[0].status="draft";
    await asUser("admin","select public.admin_write_content('news',$1,7,false)",[draft]);
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220009_news_editor.sql",import.meta.url),"utf8"));
    const updated=(await asUser("admin","select draft,published,version from public.content_documents where key='news'")).rows[0];
    assert.equal(updated.version,9);
    assert.equal(updated.draft.articles[0].status,"archived");
    assert.deepEqual(updated.draft.articles[0].body,draft.articles[0].body);
    assert.equal(updated.published.articles[0].publisher_name,"admin");
    assert.equal(updated.draft.articles[0].publisher_name,"admin");
    assert.equal(updated.published.articles[0].status,"published");
    assert.ok(!(await asUser("admin","select body from public.content_revisions where key='news'")).rows.some(row=>row.body.articles.some(a=>a.status==="draft")));
  });

  await t.test("rich news drafts stay private, publisher names cannot be forged, and only changed published articles get the publishing admin name", async () => {
    const news=defaultContent("news");
    news.articles[0].publisher_name="Forged publisher";
    news.articles[0].richText={type:"doc",content:[
      {type:"heading",attrs:{level:2},content:[{type:"text",text:"A heading"}]},
      {type:"paragraph",content:[{type:"text",text:"Bold and italic",marks:[{type:"bold"},{type:"italic"}]}]},
      {type:"orderedList",attrs:{start:1,type:null},content:[{type:"listItem",content:[{type:"paragraph",content:[{type:"text",text:"A list item"}]}]}]},
    ]};
    const write=async(body,version,publish,user="admin")=>(await asUser(user,"select public.admin_write_news($1,$2,$3) as result",[body,version,publish])).rows[0].result;
    await assert.rejects(write(news,9,true,"student"),/approved admin/);
    const saved=await write(news,9,false);
    assert.equal(saved.version,10);
    assert.equal(saved.body.articles[0].publisher_name,"admin");
    assert.equal((await asUser("student","select public.public_content('news') as body")).rows[0].body.articles[0].richText,undefined);
    await assert.rejects(write(news,9,true),/Another admin/);
    await superQuery("update public.profiles set full_name='Publishing Admin' where id=$1",[ids.admin]);
    const published=await write(news,10,true);
    assert.equal(published.body.articles[0].publisher_name,"Publishing Admin");
    assert.equal(published.body.articles[1].publisher_name,"admin");
    const publicArticle=(await asUser("student","select public.public_content('news') as body")).rows[0].body.articles[0];
    assert.deepEqual(publicArticle.richText,news.articles[0].richText);
    assert.equal(publicArticle.publisher_name,"Publishing Admin");
    const restored=structuredClone(published.body);
    restored.articles[0].status="archived";
    const archived=await write(restored,11,true);
    assert.equal(archived.body.articles[0].publisher_name,"Publishing Admin");
    assert.ok(!(await asUser("student","select public.public_content('news') as body")).rows[0].body.articles.some(a=>a.slug===restored.articles[0].slug));
    await superQuery("update public.profiles set full_name='Second Publishing Admin' where id=$1",[ids.admin]);
    restored.articles[0].status="published";
    const republished=await write(restored,12,true);
    assert.equal(republished.body.articles[0].publisher_name,"Second Publishing Admin");
    const revision=(await asUser("admin","select body from public.content_revisions where key='news' order by id desc limit 1")).rows[0].body;
    assert.deepEqual(revision,republished.body);
  });

  await t.test("database rejects unsafe rich text, unknown marks and retired visibility even through direct RPC calls", async () => {
    for (const patch of [
      {status:"draft"},
      {richText:{type:"doc",content:[{type:"script",text:"alert(1)"}]}},
      {richText:{type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"x",marks:[{type:"link",attrs:{href:"javascript:alert(1)"}}]}]}]}},
      {richText:{type:"doc",content:[{type:"paragraph",attrs:{onclick:"alert(1)"}}]}},
      {richText:{type:"doc",content:[{type:"orderedList",attrs:{start:-1},content:[]}]}},
    ]) {
      const news=defaultContent("news");
      Object.assign(news.articles[0],patch);
      await assert.rejects(asUser("admin","select public.admin_write_news($1,13,true)",[news]),/Published or Archived|unsupported formatting/);
    }
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.admin_write_news($1,14,true)",[defaultContent("news")]),/permission denied/);
  });

  await t.test("standard editor fix saves, reloads and republishes every toolbar format without changing old content or versions during upgrade", async () => {
    const before=(await asUser("admin","select draft,published,version from public.content_documents where key='news'")).rows[0];
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220010_article_editor_fix.sql",import.meta.url),"utf8"));
    assert.deepEqual((await asUser("admin","select draft,published,version from public.content_documents where key='news'")).rows[0],before);
    const doc=deltaToArticle([
      {insert:"Heading 2"},{insert:"\n",attributes:{header:2}},
      {insert:"Heading 3"},{insert:"\n",attributes:{header:3}},
      {insert:"All four marks",attributes:{bold:true,italic:true,underline:true,strike:true}},{insert:"\n"},
      {insert:"Bullet"},{insert:"\n",attributes:{list:"bullet"}},
      {insert:"Nested item"},{insert:"\n",attributes:{list:"ordered",indent:1}},
      {insert:"Quoted text"},{insert:"\n",attributes:{blockquote:true}},
    ]);
    const news=structuredClone(before.draft);
    news.articles[0].richText=doc;
    news.articles[0].body=articlePlainText(doc);
    const saved=(await asUser("admin","select public.admin_write_news($1,$2,false) as result",[news,before.version])).rows[0].result;
    const reloaded=(await asUser("admin","select draft,version from public.content_documents where key='news'")).rows[0];
    assert.equal(reloaded.version,saved.version);
    assert.deepEqual(reloaded.draft.articles[0].richText,doc);
    assert.deepEqual(deltaToArticle(articleToDelta(reloaded.draft.articles[0].richText)),doc);
    const again=(await asUser("admin","select public.admin_write_news($1,$2,false) as result",[reloaded.draft,reloaded.version])).rows[0].result;
    await asUser("admin","select public.admin_write_news($1,$2,true)",[again.body,again.version]);
    const publicDoc=(await asUser("student","select public.public_content('news') as body")).rows[0].body;
    assert.deepEqual(publicDoc.articles.find(a=>a.slug===news.articles[0].slug).richText,doc);
  });

  await t.test("stale-version recovery safely merges another article, retries once and still rejects real conflicts", async () => {
    const original=(await asUser("admin","select draft,version from public.content_documents where key='news'")).rows[0];
    const mine=structuredClone(original.draft), theirs=structuredClone(original.draft);
    mine.articles[0].title="Local editor title";
    theirs.articles[1].title="Other editor title";
    const updated=(await asUser("admin","select public.admin_write_news($1,$2,false) as result",[theirs,original.version])).rows[0].result;
    await assert.rejects(asUser("admin","select public.admin_write_news($1,$2,false)",[mine,original.version]),/Another admin/);
    const merged=mergeContentDraft(original.draft,mine,updated.body);
    const result=(await asUser("admin","select public.admin_write_news($1,$2,false) as result",[merged,updated.version])).rows[0].result;
    assert.equal(result.body.articles[0].title,mine.articles[0].title);
    assert.equal(result.body.articles[1].title,theirs.articles[1].title);
    const conflicting=structuredClone(original.draft);
    conflicting.articles[0].title="Conflicting local title";
    assert.equal(mergeContentDraft(original.draft,conflicting,result.body),null);
  });

  await t.test("fixed validator accepts standard editor output but still rejects executable marks, embeds and invalid attributes", async () => {
    const current=(await asUser("admin","select version from public.content_documents where key='news'")).rows[0].version;
    for (const node of [
      {type:"paragraph",attrs:{onclick:"alert(1)"}},
      {type:"heading",attrs:{level:null}},
      {type:"heading",attrs:{level:2,onclick:"alert(1)"}},
      {type:"paragraph",content:[{type:"text",text:"Link",marks:[{type:"link",attrs:{href:"javascript:alert(1)"}}]}]},
      {type:"image",attrs:{src:"data:text/html,hi"}},
      {type:"orderedList",attrs:{start:1,type:"a"},content:[{type:"listItem",content:[{type:"paragraph"}]}]},
    ]) {
      const news=defaultContent("news");
      news.articles[0].richText={type:"doc",content:[node]};
      await assert.rejects(asUser("admin","select public.admin_write_news($1,$2,false)",[news,current]),/unsupported formatting/);
    }
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.valid_article_node($1)",[{type:"doc",content:[{type:"paragraph"}]}]),/permission denied/);
  });

  await t.test("article media saves and reloads with private image access until publication, and denies unsafe or missing embeds", async () => {
    const before = (await asUser("admin", "select draft,published,version from public.content_documents where key='news'")).rows[0];
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220011_article_media.sql", import.meta.url), "utf8"));
    assert.deepEqual((await asUser("admin", "select draft,published,version from public.content_documents where key='news'")).rows[0], before);
    const name = "00000000-0000-4000-8000-000000000099.jpg";
    const src = `/api/content-media/${name}`;
    await superQuery("insert into storage.objects(bucket_id,name) values ('web-content',$1)", [name]);
    const news = structuredClone(before.draft);
    news.articles[0].richText = { type: "doc", content: [
      { type: "image", attrs: { src } },
      { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" } },
    ] };
    news.articles[0].body = articlePlainText(news.articles[0].richText);
    news.articles[0].status = "published";
    let saved = (await asUser("admin", "select public.admin_write_news($1,$2,false) as result", [news, before.version])).rows[0].result;
    assert.deepEqual(deltaToArticle(articleToDelta(saved.body.articles[0].richText)), news.articles[0].richText);
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    assert.equal((await db.query("select public.can_read_content_media($1) as allowed", [name])).rows[0].allowed, false);
    saved = (await asUser("admin", "select public.admin_write_news($1,$2,true) as result", [saved.body, saved.version])).rows[0].result;
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    assert.equal((await db.query("select public.can_read_content_media($1) as allowed", [name])).rows[0].allowed, true);
    assert.deepEqual((await db.query("select public.public_content('news') as body")).rows[0].body.articles.find(a => a.slug === news.articles[0].slug).richText, news.articles[0].richText);
    const archived = structuredClone(saved.body);
    archived.articles[0].status = "archived";
    saved = (await asUser("admin", "select public.admin_write_news($1,$2,true) as result", [archived, saved.version])).rows[0].result;
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    assert.equal((await db.query("select public.can_read_content_media($1) as allowed", [name])).rows[0].allowed, false);
    for (const node of [
      { type: "image", attrs: { src: "https://external.test/photo.jpg" } },
      { type: "image", attrs: { src, onerror: "alert(1)" } },
      { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com.evil.test/embed/aqz-KE-bpKQ" } },
      { type: "youtube", attrs: { src: "javascript:alert(1)" } },
      { type: "image", attrs: { src: "/api/content-media/00000000-0000-4000-8000-000000000098.jpg" } },
    ]) {
      const invalid = structuredClone(saved.body);
      invalid.articles[0].richText = { type: "doc", content: [node] };
      await assert.rejects(asUser("admin", "select public.admin_write_news($1,$2,false)", [invalid, saved.version]), /unsupported formatting|image is missing/);
    }
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.valid_article_node($1)", [news.articles[0].richText]), /permission denied/);
  });

  await t.test("article style upgrade preserves content and saves alignment, color and resized images through publish", async () => {
    const before = (await asUser("admin", "select draft,published,version from public.content_documents where key='news'")).rows[0];
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220012_article_styles.sql", import.meta.url), "utf8"));
    assert.deepEqual((await asUser("admin", "select draft,published,version from public.content_documents where key='news'")).rows[0], before);
    const news = structuredClone(before.draft);
    const doc = deltaToArticle([
      { insert: "Colorful heading", attributes: { bold: true, italic: true, underline: true, strike: true, color: "#e60000" } },
      { insert: "\n", attributes: { header: 2, align: "center" } },
      { insert: { image: "/images/learning-community.jpg" }, attributes: { width: "50%" } }, { insert: "\n" },
      { insert: "Right aligned quote" }, { insert: "\n", attributes: { blockquote: true, align: "right" } },
      { insert: "Justified list" }, { insert: "\n", attributes: { list: "ordered", align: "justify" } },
    ]);
    news.articles[0].richText = doc;
    news.articles[0].body = articlePlainText(doc);
    news.articles[0].status = "published";
    let saved = (await asUser("admin", "select public.admin_write_news($1,$2,false) as result", [news, before.version])).rows[0].result;
    assert.deepEqual(deltaToArticle(articleToDelta(saved.body.articles[0].richText)), doc);
    saved = (await asUser("admin", "select public.admin_write_news($1,$2,true) as result", [saved.body, saved.version])).rows[0].result;
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    assert.deepEqual((await db.query("select public.public_content('news') as body")).rows[0].body.articles.find(article => article.slug === news.articles[0].slug).richText, doc);
    for (const node of [
      { type: "paragraph", attrs: { align: "evil" } },
      { type: "heading", attrs: { align: "center" } },
      { type: "image", attrs: { src: "/images/test.jpg", width: 101 } },
      { type: "image", attrs: { src: "/images/test.jpg", width: "50%" } },
      { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ", width: 50 } },
      { type: "paragraph", content: [{ type: "text", text: "Bad", marks: [{ type: "color", attrs: { color: "red; position:fixed" } }] }] },
      { type: "paragraph", content: [{ type: "text", text: "Bad", marks: [{ type: "bold", attrs: { color: "#e60000" } }] }] },
    ]) {
      const invalid = structuredClone(saved.body);
      invalid.articles[0].richText = { type: "doc", content: [node] };
      await assert.rejects(asUser("admin", "select public.admin_write_news($1,$2,false)", [invalid, saved.version]), /unsupported formatting/);
    }
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.valid_article_node_media($1)", [doc]), /permission denied/);
  });

  await t.test("recruitment migrations preserve existing members, lessons and content", async () => {
    const counts = () => superQuery(`select
      (select count(*) from public.profiles)::integer as profiles,
      (select count(*) from public.lesson_slots)::integer as slots,
      (select count(*) from public.bookings)::integer as bookings,
      (select count(*) from public.content_documents)::integer as documents`);
    const before = (await counts()).rows[0];
    await db.exec(await readFile(new URL("../supabase/migrations/202610220013_recruitment.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/202610220014_recruitment_workflow.sql", import.meta.url), "utf8"));
    assert.deepEqual((await counts()).rows[0], before);
    assert.equal((await asUser("admin", "select public.recruitment_workflow_version() as version")).rows[0].version, 14);
    await asUser("admin", "select public.review_member($1,'approved')", [ids.student]);
    assert.equal((await asUser("student", "select role from public.profiles where id=$1", [ids.student])).rows[0].role, "student");
  });

  await t.test("teacher directory statistics aggregate all completed lessons and distinct attending students, for admins only", async () => {
    const teacher = "00000000-0000-4000-8000-000000000701";
    const zeroTeacher = "00000000-0000-4000-8000-000000000702";
    const pendingTeacher = "00000000-0000-4000-8000-000000000703";
    const absentStudent = "00000000-0000-4000-8000-000000000704";
    await superQuery("select 1");
    await db.exec(await readFile(new URL("../supabase/migrations/202610220015_teacher_directory_statistics.sql", import.meta.url), "utf8"));
    for (const id of [teacher, zeroTeacher, pendingTeacher, absentStudent]) {
      await superQuery("insert into auth.users(id,email) values ($1,$2)", [id, `${id}@example.test`]);
      await superQuery("update public.profiles set role=$2,status=$3 where id=$1", [id, id === absentStudent ? "student" : "teacher", id === pendingTeacher ? "pending" : "approved"]);
    }
    await superQuery(`insert into public.lesson_slots(teacher_id,starts_at,ends_at,meeting_url,status)
      select $1, '2001-01-01'::timestamptz + n * interval '1 day',
        '2001-01-01'::timestamptz + n * interval '1 day' + interval '30 minutes',
        'https://meet.google.com/statistics',
        case when n <= 1003 then 'completed' when n=1004 then 'cancelled'
          when n=1005 then 'booked' else 'available' end::public.lesson_status
      from generate_series(1,1006) n`, [teacher]);
    await superQuery(`insert into public.bookings(slot_id,student_id,starts_at,ends_at,status,attendance)
      select s.id,
        case when s.starts_at < '2001-01-01'::timestamptz + interval '1001 days' then $2::uuid
          when s.starts_at = '2001-01-01'::timestamptz + interval '1001 days' then $3::uuid else $4::uuid end,
        s.starts_at,s.ends_at,
        case when s.status='cancelled' then 'cancelled' when s.status='booked' then 'booked' else 'completed' end::public.lesson_status,
        case when s.starts_at = '2001-01-01'::timestamptz + interval '1002 days' then 'absent'
          when s.starts_at = '2001-01-01'::timestamptz + interval '1003 days' then 'apologized' else 'present' end
      from public.lesson_slots s where s.teacher_id=$1 and s.status <> 'available'`, [teacher, ids.student, ids.student2, absentStudent]);
    const rows = (await asUser("admin", "select * from public.admin_teacher_statistics($1)", [[teacher, zeroTeacher, pendingTeacher, ids.student]] )).rows;
    assert.equal(rows.length, 2);
    const stats = rows.find(row => row.teacher_id === teacher);
    assert.equal(Number(stats.completed_lessons), 1003);
    assert.equal(Number(stats.students_taught), 2);
    const zero = rows.find(row => row.teacher_id === zeroTeacher);
    assert.equal(Number(zero.completed_lessons), 0);
    assert.equal(Number(zero.students_taught), 0);
    assert.deepEqual((await asUser("admin", "select * from public.admin_teacher_statistics('{}')")).rows, []);
    await assert.rejects(asUser("admin", "select * from public.admin_teacher_statistics(null)"), /at most 100/);
    await assert.rejects(asUser("admin", "select * from public.admin_teacher_statistics($1)", [Array(101).fill(teacher)]), /at most 100/);
    for (const role of ["teacher", "student", "pending"]) await assert.rejects(asUser(role, "select * from public.admin_teacher_statistics($1)", [[teacher]]), /approved admin/);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.admin_teacher_statistics($1)", [[teacher]]), /permission denied/);
  });
});
