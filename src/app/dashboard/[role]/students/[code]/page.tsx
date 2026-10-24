import { Suspense } from "react";
import DashboardLoading from "@/src/app/dashboard/loading";
import StudentProfilePage from "@/src/components/platform/StudentProfilePage";

export const metadata = { title: "Student profile | ABVN", robots: { index: false, follow: false } };

export default function StudentProfileRoute({ params }: PageProps<"/dashboard/[role]/students/[code]">) {
  return <Suspense fallback={<DashboardLoading />}><StudentProfilePage params={params} mode="view" /></Suspense>;
}
