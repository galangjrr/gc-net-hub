import type { Metadata } from "next";
import { Suspense } from "react";
import BookingStatus, { StatusSkeleton } from "./status";

export const metadata: Metadata = {
  title: "Status Booking",
  robots: { index: false },
};

export default function BookingStatusPage() {
  return (
    <Suspense fallback={<StatusSkeleton />}>
      <BookingStatus />
    </Suspense>
  );
}
