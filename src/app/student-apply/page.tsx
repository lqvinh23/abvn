import RecruitmentPage from "@/src/components/recruitment/RecruitmentPage";

export const metadata = {
  title: "Become a Student | A Better Vietnam",
  description: "Apply for free online English lessons, track your application, and book your ABVN interview.",
};

export default function StudentApplicationPage() {
  return <RecruitmentPage role="student" />;
}
