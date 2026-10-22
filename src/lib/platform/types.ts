import type { ContentBody, ContentDocument, ContentKey, ContentRevision } from "../content/schema";

export type Role = "teacher" | "student" | "admin";
export type AccountStatus = "pending" | "approved" | "suspended" | "rejected";
export type ParticipationStatus = "active" | "inactive" | "guest" | "banned" | "suspended";
export type LessonStatus = "available" | "booked" | "completed" | "cancelled";
export type Attendance = "present" | "absent" | "apologized" | "cancelled";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role | null;
  requested_role: "teacher" | "student" | null;
  status: AccountStatus;
  participation_status: ParticipationStatus;
  time_zone: string;
  country: string;
  bio: string;
  teaching_focus: string;
  hobbies: string;
  proficiency: string;
  avatar_path: string | null;
  created_at: string;
  member_code: string;
  member_number: number | null;
};

export type AvailableLesson = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  country: string;
  bio: string;
  teaching_focus: string;
  starts_at: string;
  ends_at: string;
};

export type Lesson = {
  slot_id: string;
  booking_id: string | null;
  teacher_name: string;
  student_name: string | null;
  starts_at: string;
  ends_at: string;
  slot_status: LessonStatus | null;
  booking_status: LessonStatus | null;
  meeting_url: string | null;
  attendance: Attendance | null;
  teacher_comment: string | null;
  student_comment: string | null;
  student_rating: number | null;
  is_my_class?: boolean;
  can_book?: boolean;
};

export type CalendarLesson = Lesson & {
  teacher_code: string;
  student_code: string | null;
  title: string;
  description: string;
  can_book: boolean;
  teacher_number: number | null;
  student_number: number | null;
  teacher_avatar_url: string | null;
  student_avatar_url: string | null;
  teacher_time_zone: string;
  student_time_zone: string | null;
};

export type CalendarRecord = Omit<CalendarLesson, "teacher_avatar_url" | "student_avatar_url"> & {
  teacher_avatar_path: string | null;
  student_avatar_path: string | null;
};

export type MemberDetails = Pick<Profile, "member_code" | "full_name" | "role" | "country" | "bio" | "teaching_focus" | "hobbies" | "proficiency">;

type ReadOnlyTable<T> = {
  Row: T;
  Insert: never;
  Update: never;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: ReadOnlyTable<Profile>;
      content_documents: ReadOnlyTable<ContentDocument>;
      content_revisions: ReadOnlyTable<ContentRevision>;
    };
    Views: Record<string, never>;
    Functions: {
      admin_write_news: {
        Args: { p_body: ContentBody; p_version: number; p_publish: boolean };
        Returns: { version: number; body: ContentBody };
      };
      public_content: {
        Args: { p_key: ContentKey };
        Returns: ContentBody | null;
      };
      admin_write_content: {
        Args: { p_key: ContentKey; p_body: ContentBody; p_version: number; p_publish: boolean };
        Returns: number;
      };
      admin_save_member: {
        Args: { p_user_id: string; p_name: string; p_country: string; p_bio: string; p_time_zone: string; p_focus: string; p_hobbies: string; p_proficiency: string; p_participation_status: ParticipationStatus };
        Returns: undefined;
      };
      public_teacher_directory: {
        Args: Record<string, never>;
        Returns: (Pick<Profile, "member_code" | "member_number" | "full_name" | "country" | "bio" | "participation_status" | "created_at" | "avatar_path"> & { lesson_count: number })[];
      };
      dashboard_calendar_details: {
        Args: { p_from: string; p_to: string };
        Returns: CalendarRecord[];
      };
      dashboard_shared_calendar: {
        Args: { p_from: string; p_to: string };
        Returns: (CalendarRecord & { is_my_class: boolean })[];
      };
      dashboard_calendar: {
        Args: { p_from: string; p_to: string };
        Returns: Omit<CalendarRecord, "teacher_time_zone" | "student_time_zone">[];
      };
      member_profile_details: {
        Args: { p_code: string };
        Returns: (MemberDetails & Pick<Profile, "member_number">)[];
      };
      teacher_student_directory: {
        Args: Record<string, never>;
        Returns: Pick<Profile, "member_code" | "member_number" | "full_name" | "country" | "proficiency">[];
      };
      teacher_students: {
        Args: Record<string, never>;
        Returns: Pick<Profile, "member_code" | "full_name" | "country" | "proficiency">[];
      };
      member_profile: {
        Args: { p_code: string };
        Returns: MemberDetails[];
      };
      dashboard_lessons: {
        Args: { p_from: string; p_to: string };
        Returns: Omit<CalendarLesson, "teacher_number" | "student_number" | "teacher_avatar_url" | "student_avatar_url" | "teacher_time_zone" | "student_time_zone">[];
      };
      create_calendar_slot: {
        Args: { p_start: string; p_end: string; p_meeting_url: string; p_title: string; p_description: string };
        Returns: string;
      };
      request_membership: {
        Args: { p_role: "teacher" | "student" };
        Returns: undefined;
      };
      save_profile: {
        Args: {
          p_name: string;
          p_country: string;
          p_bio: string;
          p_time_zone: string;
          p_focus: string;
          p_hobbies: string;
          p_proficiency: string;
          p_avatar_path: string | null;
        };
        Returns: undefined;
      };
      review_member: {
        Args: { p_user_id: string; p_status: AccountStatus };
        Returns: undefined;
      };
      create_lesson_slot: {
        Args: { p_start: string; p_end: string; p_meeting_url: string };
        Returns: string;
      };
      available_lessons: {
        Args: Record<string, never>;
        Returns: AvailableLesson[];
      };
      my_lessons: { Args: Record<string, never>; Returns: Lesson[] };
      book_lesson: { Args: { p_slot_id: string }; Returns: string };
      cancel_lesson: { Args: { p_slot_id: string }; Returns: undefined };
      submit_lesson_feedback: {
        Args: {
          p_booking_id: string;
          p_comment: string;
          p_rating: number | null;
          p_attendance: Attendance | null;
        };
        Returns: undefined;
      };
      submit_written_feedback: {
        Args: { p_booking_id: string; p_comment: string; p_attendance: Attendance | null };
        Returns: undefined;
      };
    };
    Enums: {
      account_role: Role;
      account_status: AccountStatus;
      lesson_status: LessonStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ActionResult = {
  ok: boolean;
  message: string;
};
