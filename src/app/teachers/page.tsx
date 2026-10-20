import TeacherListing from "@/src/components/teachers/TeacherListing";
import TeacherPageHeader from "@/src/components/teachers/TeacherPageHeader";

export const metadata = {
  title: "Our Volunteer Teachers | A Better Vietnam",
  description:
    "Meet a selection of volunteer teachers listed in A Better Vietnam's public directory.",
};

export default function TeachersPage() {
  return (
    <main className="flex-1">
      <TeacherPageHeader />
      <TeacherListing page={1} />
    </main>
  );
}
