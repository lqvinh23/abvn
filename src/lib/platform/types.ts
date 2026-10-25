import type { ContentBody, ContentDocument, ContentKey, ContentRevision } from "../content/schema";
import type { ApplicationField } from "./application-fields";
import type { MemberPolicySummary, PlatformSettingsReport, SettingValues } from "./settings";

export type Role = "teacher" | "student" | "admin";
export type AccountStatus = "pending" | "approved" | "suspended" | "rejected";
export type ParticipationStatus = "active" | "inactive" | "guest" | "banned" | "suspended";
export type LessonStatus = "available" | "booked" | "completed" | "cancelled";
export type Attendance = "present" | "absent" | "apologized" | "cancelled";
export type RecruitmentRole = "teacher" | "student";
export type StudentRecruitmentCampaign = {
  id: string; name: string; form_opens_on: string; form_closes_on: string;
  interview_opens_on: string; interview_closes_on: string; due_on: string; created_at: string; completed_at: string | null;
};
export type StudentCampaignReport = {
  applications: number; invited: number; accepted: number;
  gender: { label: string; count: number }[];
  age: { label: string; count: number }[];
  area: { label: string; count: number }[];
};
export type RecruitmentStatus = "submitted" | "interview_invited" | "interview_booked" | "review_rejected" | "interview_rejected" | "accepted";
export type RecruitmentQuestion = {
  id: string; role: RecruitmentRole; label: string; help_text: string;
  field_type: "short_text" | "long_text" | "number" | "select" | "boolean" | "url";
  options: string[]; required: boolean; position: number; active: boolean;
  created_at: string; updated_at: string;
};
export type RecruitmentApplication = {
  id: string; applicant_id: string; role: RecruitmentRole; status: RecruitmentStatus;
  campaign_id?: string | null; gender?: "male" | "female" | "other" | null; national_id_last8?: string | null;
  full_name: string; email: string; phone: string; country: string; time_zone: string;
  date_of_birth: string | null; intro: string; weekly_hours: number | null;
  city?: string; address?: string; occupation?: string; organization?: string; proficiency?: string; goals?: string; hobbies?: string;
  intro_video_url: string | null; cv_path: string | null; photo_path: string | null;
  answers: { question_id: string; label: string; answer: string }[];
  reapply_allowed: boolean; created_at: string; updated_at: string; decided_at: string | null;
};
export type InterviewSlot = {
  id: string; starts_at: string; ends_at: string; meeting_url: string;
  status: "available" | "booked" | "cancelled"; application_id: string | null; created_at: string;
  title?: string; description?: string; created_by?: string | null; ever_booked?: boolean; last_application_id?: string | null;
};
export type InterviewAssessment = { id: string; slot_id: string; application_id: string; admin_id: string; note: string; created_at: string };
export type ScheduleChangeNotification = {
  id: string;
  recipient_id: string;
  slot_type: "lesson" | "interview";
  slot_id: string;
  slot_title: string;
  previous_starts_at: string;
  previous_ends_at: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  read_at: string | null;
};
export type RecruitmentFeedback = {
  id: string; application_id: string; admin_id: string; stage: "review" | "interview";
  decision: "invite" | "reject" | "accept" | "note"; note: string; created_at: string;
};
export type StudentApplicationReview = {
  application_id: string; round: "application" | "interview"; decision: "pass" | "fail" | null;
  note: string; admin_id: string; revision: number; updated_at: string; published_at: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role | null;
  admin_access: boolean;
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
  city?: string;
  address?: string;
  occupation?: string;
  organization?: string;
  facebook_url?: string;
  cv_path?: string | null;
  student_joined_at?: string | null;
  study_expires_on?: string | null;
};

// One row of the student directory; admins and teachers both receive this shape.
export type StudentDirectoryRow = {
  member_code: string; member_number: number | null; full_name: string; email: string | null;
  participation_status: ParticipationStatus; country: string; city: string; proficiency: string;
  created_at: string; student_joined_at: string | null; study_expires_on: string | null;
  attended_total: number | null; attended_1w: number | null; attended_4w: number | null;
  absent: number | null; apologized: number | null;
};

export type StudentDirectoryStatistics = {
  student_id: string;
  attended_total: number;
  attended_1w: number;
  attended_4w: number;
  absent: number;
  apologized: number;
};

export type StudentLesson = {
  starts_at: string; ends_at: string; title: string | null; teacher_name: string; teacher_code: string;
  booking_status: LessonStatus; attendance: Attendance | null;
};
export type StudentFeedback = {
  created_at: string; lesson_at: string; teacher_name: string; teacher_code: string; title: string | null;
  attendance: Attendance | null; comment: string;
};
export type StudentProfileReport = {
  viewer: "admin" | "teacher";
  profile: {
    id: string; member_code: string; member_number: number | null; full_name: string; email: string | null;
    status: AccountStatus; participation_status: ParticipationStatus; time_zone: string; country: string;
    city: string; address: string; occupation: string; organization: string; facebook_url: string;
    bio: string; goals: string; hobbies: string; proficiency: string; avatar_path: string | null; cv_path: string | null;
    created_at: string; student_joined_at: string | null; study_expires_on: string | null;
  };
  details: { phone?: string; date_of_birth?: string | null; national_id_last8?: string | null; age: number | null; intro_video_url: string | null } | null;
  application: {
    id: string; submitted_at: string; decided_at: string | null; intro: string;
    country: string; time_zone: string; answers: { question_id: string; label: string; answer: string }[];
  } | null;
  stats: {
    attended: number; attended_1w: number; attended_4w: number; absent: number; apologized: number;
    cancelled: number; upcoming: number; hours: number; teachers: number;
    first_lesson_at: string | null; last_lesson_at: string | null;
  };
  lessons: StudentLesson[];
  milestones: { count: number; reached_at: string }[];
  feedback: StudentFeedback[];
  restrictions: { created_at: string; from_status: ParticipationStatus | null; to_status: ParticipationStatus; reason: string; changed_by: string | null }[];
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
export type TeacherStatistics = { teacher_id: string; completed_lessons: number; students_taught: number };
export type LessonCounts = { total: number; completed: number; booked: number; unbooked: number; absent: number; apologized: number; cancelled: number };
export type TeacherActivityRow = { member_code: string; member_number: number | null; full_name: string; total_lessons: number; completed_lessons: number; students_taught: number };
export type StudentActivityRow = { member_code: string; member_number: number | null; full_name: string; lessons_attended: number };
export type RestrictedStudentRow = { member_code: string; member_number: number | null; full_name: string; status: "banned" | "suspended"; teacher_name: string | null; teacher_code: string | null; reported_at: string | null };
export type AcademicStatistics = {
  period_start: string;
  period_end: string;
  granularity: "week" | "month" | "quarter" | "year";
  lessons: { totals: LessonCounts; series: (LessonCounts & { label: string })[] };
  teachers: {
    totals: { total: number; engaged: number; new: number };
    series: { label: string; total_lessons: number; completed_lessons: number; engaged: number; new: number }[];
    rows: TeacherActivityRow[];
  };
  students: {
    totals: { active: number; engaged: number; restricted: number };
    series: { label: string; lessons_attended: number; engaged: number }[];
    engaged_rows: StudentActivityRow[];
    restricted_rows: RestrictedStudentRow[];
    distribution: { label: string; students: number }[];
  };
};

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
      admin_preferences: ReadOnlyTable<{ admin_id: string; interview_meeting_url: string }>;
      recruitment_questions: ReadOnlyTable<RecruitmentQuestion>;
      recruitment_form_fields: ReadOnlyTable<ApplicationField>;
      profile_application_details: ReadOnlyTable<{ profile_id: string; phone: string; date_of_birth: string | null; national_id_last8: string | null; weekly_hours: number; intro_video_url: string | null; answers: RecruitmentApplication["answers"]; application_id: string }>;
      recruitment_applications: ReadOnlyTable<RecruitmentApplication>;
      student_recruitment_campaigns: ReadOnlyTable<StudentRecruitmentCampaign>;
      interview_slots: ReadOnlyTable<InterviewSlot>;
      interview_assessments: ReadOnlyTable<InterviewAssessment>;
      schedule_change_notifications: ReadOnlyTable<ScheduleChangeNotification>;
      recruitment_feedback: ReadOnlyTable<RecruitmentFeedback>;
      student_application_reviews: ReadOnlyTable<StudentApplicationReview>;
      content_documents: ReadOnlyTable<ContentDocument>;
      content_revisions: ReadOnlyTable<ContentRevision>;
    };
    Views: Record<string, never>;
    Functions: {
      admin_platform_settings: { Args: Record<string, never>; Returns: PlatformSettingsReport };
      admin_save_platform_settings: { Args: { p_values: SettingValues; p_note: string }; Returns: number };
      admin_reset_platform_settings: { Args: Record<string, never>; Returns: number };
      admin_run_policy_review: { Args: Record<string, never>; Returns: { restored: number; inactivated: number } };
      member_policy_summary: { Args: Record<string, never>; Returns: MemberPolicySummary };
      review_my_student_policies: { Args: Record<string, never>; Returns: { restored: number; inactivated: number } };
      admin_teacher_stat_order: { Args: { p_query: string; p_participation: string; p_sort: string; p_desc: boolean; p_offset: number; p_limit: number }; Returns: Profile[] };
      save_admin_profile: { Args: { p_name: string; p_country: string; p_time_zone: string; p_avatar_path: string | null; p_meeting_url: string }; Returns: undefined };
      recruitment_workflow_version: { Args: Record<string, never>; Returns: number };
      admin_save_student_campaign: {
        Args: { p_id: string | null; p_name: string; p_form_opens_on: string; p_form_closes_on: string; p_interview_opens_on: string; p_interview_closes_on: string; p_due_on: string };
        Returns: string;
      };
      admin_student_campaign_report: { Args: { p_campaign_id: string }; Returns: StudentCampaignReport };
      admin_manage_student_campaign: { Args: { p_campaign_id: string; p_operation: "complete" | "incomplete" | "delete" }; Returns: undefined };
      submit_recruitment_application: {
        Args: {
          p_role: RecruitmentRole; p_full_name: string; p_country: string; p_time_zone: string;
          p_phone: string; p_date_of_birth: string | null; p_intro: string; p_weekly_hours: number | null;
          p_intro_video_url: string | null; p_cv_path: string | null; p_photo_path: string | null;
          p_answers: Record<string, string>;
          p_city?: string; p_address?: string; p_occupation?: string; p_organization?: string;
          p_proficiency?: string; p_goals?: string; p_hobbies?: string;
          p_gender?: "male" | "female" | "other" | null;
          p_national_id_last8?: string | null;
        };
        Returns: string;
      };
      admin_save_recruitment_question: {
        Args: {
          p_id: string | null; p_role: RecruitmentRole; p_label: string; p_help: string;
          p_field_type: RecruitmentQuestion["field_type"]; p_options: string[];
          p_required: boolean; p_position: number; p_active: boolean;
        };
        Returns: string;
      };
      admin_save_application_field: { Args: { p_role: string; p_key: string; p_label: string; p_help: string; p_required: boolean; p_position: number; p_active: boolean }; Returns: undefined };
      admin_manage_application_question: { Args: { p_role: string; p_id: string; p_builtin: boolean; p_action: string }; Returns: undefined };
      admin_review_application: { Args: { p_application_id: string; p_decision: string; p_note: string }; Returns: undefined };
      admin_save_application_assessment: { Args: { p_application_id: string; p_note: string }; Returns: undefined };
      admin_save_student_application_review: { Args: { p_application_id: string; p_round: string; p_decision: string | null; p_note: string; p_revision: number }; Returns: undefined };
      admin_publish_student_campaign_round: { Args: { p_campaign_id: string; p_round: string }; Returns: number };
      admin_create_interview_slot: { Args: { p_starts_at: string; p_ends_at: string; p_meeting_url: string }; Returns: string };
      interview_details_version: { Args: Record<string, never>; Returns: number };
      admin_offer_interview_slot: { Args: { p_starts_at: string; p_ends_at: string; p_meeting_url: string; p_title: string; p_description: string; p_application_id: string | null }; Returns: string };
      admin_add_interview_assessment: { Args: { p_slot_id: string; p_application_id: string; p_note: string }; Returns: undefined };
      admin_cancel_interview_slot: { Args: { p_slot_id: string }; Returns: undefined };
      edit_calendar_slot: { Args: { p_slot_id: string; p_starts_at: string; p_ends_at: string; p_meeting_url: string; p_title: string; p_description: string }; Returns: undefined };
      admin_edit_interview_slot: { Args: { p_slot_id: string; p_starts_at: string; p_ends_at: string; p_meeting_url: string; p_title: string; p_description: string }; Returns: undefined };
      member_read_schedule_change: { Args: { p_notification_id: string }; Returns: undefined };
      book_interview_slot: { Args: { p_slot_id: string }; Returns: string };
      cancel_interview_booking: { Args: Record<string, never>; Returns: undefined };
      admin_record_interview_result: { Args: { p_application_id: string; p_decision: string; p_feedback: string }; Returns: undefined };
      admin_reopen_application: { Args: { p_application_id: string }; Returns: undefined };
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
      admin_teacher_statistics: {
        Args: { p_teacher_ids: string[] };
        Returns: TeacherStatistics[];
      };
      admin_student_directory_statistics: {
        Args: { p_student_ids: string[] };
        Returns: StudentDirectoryStatistics[];
      };
      admin_student_profile: {
        Args: { p_code: string; p_time_zone: string };
        Returns: StudentProfileReport | null;
      };
      admin_save_student: {
        Args: {
          p_user_id: string; p_name: string; p_city: string; p_address: string; p_country: string; p_time_zone: string;
          p_bio: string; p_hobbies: string; p_goals: string; p_occupation: string; p_organization: string;
          p_facebook_url: string; p_proficiency: string; p_participation_status: ParticipationStatus;
          p_study_expires_on: string; p_phone: string; p_date_of_birth: string | null; p_intro_video_url: string;
          p_reason: string; p_avatar_path: string | null; p_cv_path: string | null;
          p_national_id_last8?: string | null;
        };
        Returns: undefined;
      };
      teacher_student_profile: {
        Args: { p_code: string; p_time_zone: string };
        Returns: StudentProfileReport | null;
      };
      teacher_student_directory_details: {
        Args: Record<string, never>;
        Returns: StudentDirectoryRow[];
      };
      admin_academic_statistics: {
        Args: { p_period: "week" | "month" | "quarter" | "year"; p_anchor: string; p_time_zone: string };
        Returns: AcademicStatistics;
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
      admin_assign_member_role: {
        Args: { p_user_id: string; p_role: Role };
        Returns: undefined;
      };
      admin_remove_member_role: {
       Args: { p_user_id: string; p_role: Role };
       Returns: undefined;
      };
      admin_remove_member_account: {
        Args: { p_user_id: string };
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
