"use client";

import dynamic from "next/dynamic";

// Dynamically import the TherapistsPageContent component with SSR disabled
const TherapistsPageContent = dynamic(
  () => import("@/components/specialists/TherapistPageContent"),
  {
    ssr: false, // Disable server-side rendering
    loading: () => <p>Loading...</p>, // Optional loading component
  }
);

export default function TherapistsPage() {
  return <TherapistsPageContent />;
}
