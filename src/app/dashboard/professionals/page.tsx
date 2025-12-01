// app/dashboard/professionals/page.tsx
"use client";

import dynamic from "next/dynamic";

// Dynamically import the ProfessionalPageContent component with SSR disabled
const ProfessionalPageContent = dynamic(
  () => import("@/components/professionals/ProfessionalPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-[#F3CFC6] border-t-transparent rounded-full" />
      </div>
    ),
  }
);

export default function ProfessionalsPage() {
  return <ProfessionalPageContent />;
}
