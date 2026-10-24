import { Suspense } from "react";
import DashboardLoading from "./loading";
import WorkspaceNavigationFeedback from "@/src/components/platform/WorkspaceNavigationFeedback";

export const metadata = {
  title: "Learning dashboard | A Better Vietnam",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardLoading />}><WorkspaceNavigationFeedback>{children}</WorkspaceNavigationFeedback></Suspense>;
}
