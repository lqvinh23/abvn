import { Suspense } from "react";
import DashboardLoading from "./loading";

export const metadata = {
  title: "Learning dashboard | A Better Vietnam",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardLoading />}>{children}</Suspense>;
}
