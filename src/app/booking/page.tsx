import type { Metadata } from "next";
import { Suspense } from "react";
import BookingCheckout, { CheckoutSkeleton } from "./checkout";

export const metadata: Metadata = {
  title: "Booking PC",
  description: "Pilih paket, bayar QRIS atau di kasir, langsung dapet nomor antrean.",
};

export default function BookingPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <BookingCheckout />
    </Suspense>
  );
}
