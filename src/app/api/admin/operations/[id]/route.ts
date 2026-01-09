// src/app/api/admin/operations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  OPERATION_STATUSES,
  PRIORITIES,
  OPERATION_TYPES,
} from "@/types/operations";

// Validation schema for updating operations
const updateOperationSchema = z.object({
  type: z.enum(OPERATION_TYPES),
  status: z.enum(OPERATION_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  adminResponse: z.string().max(5000).optional(),
  // For disputes specifically
  disputeAction: z.enum(["confirm_cancel", "deny"]).optional(),
  adminNotes: z.string().max(5000).optional(),
});

// GET - Fetch single operation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (
      !type ||
      !OPERATION_TYPES.includes(type as (typeof OPERATION_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "Invalid or missing type parameter" },
        { status: 400 }
      );
    }

    let item = null;

    if (type === "feedback") {
      item = await prisma.feedback.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              phoneNumber: true,
              createdAt: true,
              lastOnline: true,
              status: true,
            },
          },
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });
    } else if (type === "report") {
      item = await prisma.report.findUnique({
        where: { id },
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              phoneNumber: true,
              createdAt: true,
              lastOnline: true,
              status: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              phoneNumber: true,
              status: true,
              createdAt: true,
              lastOnline: true,
            },
          },
          reportedProfessional: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
              reviewCount: true,
              location: true,
              createdAt: true,
              applications: {
                select: {
                  userId: true,
                  status: true,
                  user: {
                    select: {
                      id: true,
                      email: true,
                      phoneNumber: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });
    } else if (type === "dispute") {
      item = await prisma.appointment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              phoneNumber: true,
              createdAt: true,
              lastOnline: true,
              status: true,
            },
          },
          professional: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
              reviewCount: true,
              location: true,
              createdAt: true,
              applications: {
                select: {
                  userId: true,
                  status: true,
                  user: {
                    select: {
                      id: true,
                      email: true,
                      phoneNumber: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              stripeId: true,
              createdAt: true,
            },
          },
          confirmation: true,
          earning: {
            select: {
              id: true,
              grossAmount: true,
              platformFeeAmount: true,
              status: true,
            },
          },
        },
      });
    }

    if (!item) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item, type });
  } catch (error) {
    console.error("Fetch operation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch operation" },
      { status: 500 }
    );
  }
}

// PATCH - Update operation (status, priority, respond)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateOperationSchema.parse(body);

    let updatedItem = null;
    let message = "Updated successfully";

    if (validated.type === "feedback") {
      // Update feedback
      const updateData: Record<string, unknown> = {};

      if (validated.status) {
        updateData.status = validated.status;
      }
      if (validated.priority) {
        updateData.priority = validated.priority;
      }
      if (validated.adminResponse !== undefined) {
        updateData.adminResponse = validated.adminResponse;
        updateData.adminRespondedBy = session.user.id;
        updateData.adminRespondedAt = new Date();
      }

      updatedItem = await prisma.feedback.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      message = validated.adminResponse
        ? "Response sent successfully"
        : "Feedback updated successfully";
    } else if (validated.type === "report") {
      // Update report
      const updateData: Record<string, unknown> = {};

      if (validated.status) {
        updateData.status = validated.status;
      }
      if (validated.priority) {
        updateData.priority = validated.priority;
      }
      if (validated.adminResponse !== undefined) {
        updateData.adminResponse = validated.adminResponse;
        updateData.adminRespondedBy = session.user.id;
        updateData.adminRespondedAt = new Date();
      }

      updatedItem = await prisma.report.update({
        where: { id },
        data: updateData,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          reportedProfessional: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      message = validated.adminResponse
        ? "Response sent successfully"
        : "Report updated successfully";
    } else if (validated.type === "dispute") {
      // Handle dispute - uses existing dispute logic
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { payment: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 }
        );
      }

      if (appointment.disputeStatus !== "disputed") {
        return NextResponse.json(
          { error: "This dispute has already been resolved" },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        adminNotes: validated.adminNotes || validated.adminResponse || null,
      };

      let restoredSlotInfo = null;

      if (validated.disputeAction === "confirm_cancel") {
        updateData.disputeStatus = "confirmed_canceled";
        updateData.status = "canceled";

        // Refund payment if applicable
        if (
          appointment.payment &&
          appointment.payment.status === "successful"
        ) {
          await prisma.payment.update({
            where: { id: appointment.payment.id },
            data: { status: "refunded" },
          });
        }

        // Restore availability slot
        const dateObj = appointment.startTime;
        const dayOfWeekNum = dateObj.getDay();
        const slotTime = `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;

        await prisma.availability.upsert({
          where: {
            professionalId_dayOfWeek: {
              professionalId: appointment.professionalId,
              dayOfWeek: dayOfWeekNum,
            },
          },
          update: {
            slots: { push: slotTime },
          },
          create: {
            professionalId: appointment.professionalId,
            dayOfWeek: dayOfWeekNum,
            slots: [slotTime],
            breakDuration: 30,
          },
        });

        restoredSlotInfo = {
          date: dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          time: slotTime,
          dayOfWeek: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][dayOfWeekNum],
        };

        message = "Dispute confirmed - appointment canceled and slot restored";
      } else if (validated.disputeAction === "deny") {
        updateData.disputeStatus = "denied";
        updateData.status = "completed";
        message = "Dispute denied - appointment marked as completed";
      }

      // Update confirmation record if exists
      if (appointment.id) {
        await prisma.appointmentConfirmation.updateMany({
          where: { appointmentId: appointment.id },
          data: {
            disputeResolvedAt: new Date(),
            disputeResolution:
              validated.disputeAction === "confirm_cancel"
                ? "admin_confirmed"
                : "admin_denied",
          },
        });
      }

      updatedItem = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          professional: {
            select: {
              id: true,
              name: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
      });

      if (restoredSlotInfo) {
        return NextResponse.json({
          success: true,
          message,
          item: updatedItem,
          restoredSlotInfo,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message,
      item: updatedItem,
    });
  } catch (error) {
    console.error("Update operation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update operation" },
      { status: 500 }
    );
  }
}
