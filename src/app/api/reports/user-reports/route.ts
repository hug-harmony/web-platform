// src\app\api\reports\user-reports\route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type ReportWithRelations = Prisma.ReportGetPayload<{
  include: {
    reporter: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    reportedUser: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    reportedProfessional: {
      select: {
        id: true;
        name: true;
        application: {
          select: {
            user: { select: { location: true } };
          };
        };
      };
    };
  };
}>;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports: ReportWithRelations[] = await prisma.report.findMany({
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reportedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reportedProfessional: {
          select: {
            id: true,
            name: true,
            application: {
              select: {
                user: { select: { location: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedReports = reports.map((report) => ({
      ...report,
      reportedProfessional: report.reportedProfessional
        ? {
            ...report.reportedProfessional,
            location:
              report.reportedProfessional.application?.user?.location ||
              "Unknown",
          }
        : null,
    }));

    return NextResponse.json(formattedReports);
  } catch (error) {
    console.error("Fetch reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reportedUserId, reportedProfessionalId, reason, details } =
      await request.json();
    if (!reason || (!reportedUserId && !reportedProfessionalId)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedUserId,
        reportedProfessionalId,
        reason,
        details,
      },
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error("Submit report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
