import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfileVisitsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    return <div>Please log in to view profile visits.</div>;
  }

  const visits = await prisma.profileVisit.findMany({
    where: { specialistId: session.user.id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const visitCount = visits.length;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Visits ({visitCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p>No profile visits yet.</p>
          ) : (
            <ul className="space-y-4">
              {visits.map((visit) => (
                <li key={visit.id} className="border-b pb-2">
                  <p>
                    {visit.user
                      ? `${visit.user.name || "Anonymous"} visited your profile`
                      : "Anonymous visitor"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(visit.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
