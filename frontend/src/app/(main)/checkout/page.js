import { Suspense } from "react";
import Checkout from "@/views/Checkout/Checkout";

export const metadata = {
  title: "Checkout",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center text-muted-foreground font-medium">Loading checkout...</div>}>
      <Checkout />
    </Suspense>
  );
}
