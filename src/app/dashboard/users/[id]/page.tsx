// app/dashboard/users/[id]/page.tsx

import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserProfileRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/profile/${id}`);
}
