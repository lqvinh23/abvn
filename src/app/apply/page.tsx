import RecruitmentPage from "@/src/components/recruitment/RecruitmentPage";

export const metadata = {
  title: "Become a Volunteer Teacher | A Better Vietnam",
  description: "Apply to volunteer as an English teacher, track your application, and book your ABVN interview.",
};

export default function ApplyAsTeacherPage() {
  return <RecruitmentPage role="teacher" />;
}
