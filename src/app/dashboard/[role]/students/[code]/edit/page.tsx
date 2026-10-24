import { Suspense } from "react";
import DashboardLoading from "@/src/app/dashboard/loading";
import StudentProfilePage from "@/src/components/platform/StudentProfilePage";

export const metadata = { title: "Edit student | ABVN", robots: { index: false, follow: false } };

export default function StudentEditRoute({ params }: PageProps<"/dashboard/[role]/students/[code]/edit">) {
  return <Suspense fallback={<DashboardLoading />}><StudentProfilePage params={params} mode="edit" /></Suspense>;
}
