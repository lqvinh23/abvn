import { Suspense } from "react";
import PublicTeacherListing from "@/src/components/teachers/PublicTeacherListing";
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
      <Suspense fallback={<p className="p-8 text-center">Loading teachers...</p>}><PublicTeacherListing page={1} /></Suspense>
    </main>
  );
}
