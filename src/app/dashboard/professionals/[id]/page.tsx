// app/dashboard/professionals/[id]/page.tsx

import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalProfileRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/profile/${id}`);
}
