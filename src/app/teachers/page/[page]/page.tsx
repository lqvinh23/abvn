import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PublicTeacherListing from "@/src/components/teachers/PublicTeacherListing";
import TeacherPageHeader from "@/src/components/teachers/TeacherPageHeader";
import { InlineLoading } from "@/src/components/RouteLoading";
import { getPageItems } from "@/src/lib/content-pagination";
import {
  getTeachersByStatus,
  TEACHERS_PER_PAGE,
  teacherProfiles,
} from "@/src/lib/teacher-profiles";

const totalPages = getPageItems(
  getTeachersByStatus(teacherProfiles, "active"),
  1,
  TEACHERS_PER_PAGE,
).totalPages;

export const metadata = {
  title: "Our Volunteer Teachers | A Better Vietnam",
};

export function generateStaticParams() {
  return Array.from({ length: totalPages }, (_, index) => ({
    page: String(index + 1),
  }));
}

export default async function PaginatedTeachersPage({
  params,
}: PageProps<"/teachers/page/[page]">) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    String(page) !== pageParam
  ) {
    notFound();
  }

  if (page === 1) {
    redirect("/teachers");
  }

  return (
    <main className="flex-1">
      <TeacherPageHeader />
      <Suspense fallback={<InlineLoading label="Loading teachers" />}><PublicTeacherListing page={page} /></Suspense>
    </main>
  );
}
