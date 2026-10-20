import { notFound } from "next/navigation";
import TeacherListing from "@/src/components/teachers/TeacherListing";
import TeacherPageHeader from "@/src/components/teachers/TeacherPageHeader";
import { getPageItems } from "@/src/lib/content-pagination";
import { teacherProfiles } from "@/src/lib/teacher-profiles";

const totalPages = getPageItems(teacherProfiles, 1).totalPages;

export const metadata = {
  title: "Our Volunteer Teachers | A Better Vietnam",
};

export function generateStaticParams() {
  return Array.from({ length: totalPages - 1 }, (_, index) => ({
    page: String(index + 2),
  }));
}

export default async function PaginatedTeachersPage({
  params,
}: PageProps<"/teachers/page/[page]">) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);

  if (
    !Number.isInteger(page) ||
    page < 2 ||
    page > totalPages ||
    String(page) !== pageParam
  ) {
    notFound();
  }

  return (
    <main className="flex-1">
      <TeacherPageHeader />
      <TeacherListing page={page} />
    </main>
  );
}
