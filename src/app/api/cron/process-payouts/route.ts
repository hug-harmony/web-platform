// src/app/api/cron/process-payouts/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  processAllReadyCycles,
  getCyclesReadyForProcessing,
  getOrCreateCurrentCycle,
} from "@/lib/services/payments";
import { createConfirmation } from "@/lib/services/payments/confirmation.service";
import {
  sendEarningCreatedEmail,
  sendConfirmationNeededEmail,
  sendPayoutProcessedEmail,
  sendPayoutFailedEmail,
  sendWeeklyEarningsSummaryEmail,
} from "@/lib/services/email";
import { buildDisplayName } from "@/lib/utils";
import { formatCycleDateRange } from "@/lib/utils/paymentCycle";

/**
 * Scheduled task for payment processing
 * Triggered by AWS EventBridge or manually
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggerType = request.headers.get("x-trigger-type") || "manual";
  return processPayments(triggerType);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let triggerType = "manual";
  try {
    const body = await request.json();
    triggerType = body.triggerType || "manual";
  } catch {
    // Body might be empty
  }

  return processPayments(triggerType);
}

async function processPayments(triggerType: string) {
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    triggerType,
    confirmationsCreated: 0,
    confirmationErrors: [] as string[],
    autoConfirmed: 0,
    cyclesProcessed: 0,
    payoutsProcessed: 0,
    payoutsFailed: 0,
    payoutErrors: [] as string[],
    emailsSent: 0,
    emailErrors: [] as string[],
    duration: 0,
  };

  try {
    console.log(`[CRON:PAYOUTS] Starting - Trigger: ${triggerType}`);

    // =========================================
    // STEP 1: Create confirmations for completed appointments
    // =========================================
    if (
      triggerType === "daily-confirmation" ||
      triggerType === "manual" ||
      triggerType === "weekly-payout"
    ) {
      console.log("[CRON:PAYOUTS] Step 1: Creating confirmations");

      const completedAppointments = await prisma.appointment.findMany({
        where: {
          status: "completed",
          confirmation: null,
          endTime: { lte: new Date() },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          professional: {
            include: {
              applications: {
                where: { status: "APPROVED" },
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          earning: true,
        },
      });

      console.log(
        `[CRON:PAYOUTS] Found ${completedAppointments.length} appointments`
      );

      for (const appointment of completedAppointments) {
        try {
          await createConfirmation(appointment.id);
          results.confirmationsCreated++;

          // Send email to professional about new earning
          const professionalUser =
            appointment.professional.applications[0]?.user;
          if (professionalUser?.email && appointment.earning) {
            try {
              await sendEarningCreatedEmail(
                professionalUser.email,
                buildDisplayName(professionalUser),
                appointment.user
                  ? buildDisplayName(appointment.user)
                  : "Client",
                appointment.endTime.toLocaleDateString(),
                appointment.earning.grossAmount.toFixed(2),
                appointment.earning.netAmount.toFixed(2),
                appointment.id
              );
              results.emailsSent++;
            } catch (emailError) {
              results.emailErrors.push(
                `Email to ${professionalUser.email}: ${emailError instanceof Error ? emailError.message : "Unknown"}`
              );
            }
          }
        } catch (error) {
          results.confirmationErrors.push(
            `Appointment ${appointment.id}: ${error instanceof Error ? error.message : "Unknown"}`
          );
        }
      }
    }

    // =========================================
    // STEP 2: Send confirmation reminders (24h before auto-confirm)
    // =========================================
    if (triggerType === "auto-confirm" || triggerType === "manual") {
      console.log(
        "[CRON:PAYOUTS] Step 2: Checking for auto-confirms and reminders"
      );

      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find confirmations that should be auto-confirmed
      const toAutoConfirm = await prisma.appointmentConfirmation.findMany({
        where: {
          finalStatus: "pending",
          createdAt: { lte: fortyEightHoursAgo },
        },
        include: {
          appointment: true,
        },
      });

      for (const confirmation of toAutoConfirm) {
        try {
          await prisma.appointmentConfirmation.update({
            where: { id: confirmation.id },
            data: {
              finalStatus: "auto_confirmed",
              clientConfirmed: confirmation.clientConfirmed ?? true,
              professionalConfirmed: confirmation.professionalConfirmed ?? true,
            },
          });
          results.autoConfirmed++;
        } catch (error) {
          results.confirmationErrors.push(
            `Auto-confirm ${confirmation.id}: ${error instanceof Error ? error.message : "Unknown"}`
          );
        }
      }

      // Send reminders for confirmations approaching 48h
      const needsReminder = await prisma.appointmentConfirmation.findMany({
        where: {
          finalStatus: "pending",
          createdAt: {
            gte: fortyEightHoursAgo,
            lte: twentyFourHoursAgo,
          },
          OR: [{ clientConfirmed: null }, { professionalConfirmed: null }],
        },
        include: {
          client: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          professionalUser: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          appointment: true,
        },
      });

      for (const confirmation of needsReminder) {
        const hoursRemaining = Math.ceil(
          (confirmation.createdAt.getTime() +
            48 * 60 * 60 * 1000 -
            Date.now()) /
            (60 * 60 * 1000)
        );

        // Remind client if they haven't confirmed
        if (
          confirmation.clientConfirmed === null &&
          confirmation.client.email
        ) {
          try {
            await sendConfirmationNeededEmail(
              confirmation.client.email,
              buildDisplayName(confirmation.client),
              buildDisplayName(confirmation.professionalUser),
              confirmation.appointment.endTime.toLocaleDateString(),
              hoursRemaining,
              confirmation.appointmentId,
              false
            );
            results.emailsSent++;
          } catch (emailError) {
            results.emailErrors.push(
              `Reminder to client: ${emailError instanceof Error ? emailError.message : "Unknown"}`
            );
          }
        }

        // Remind professional if they haven't confirmed
        if (
          confirmation.professionalConfirmed === null &&
          confirmation.professionalUser.email
        ) {
          try {
            await sendConfirmationNeededEmail(
              confirmation.professionalUser.email,
              buildDisplayName(confirmation.professionalUser),
              buildDisplayName(confirmation.client),
              confirmation.appointment.endTime.toLocaleDateString(),
              hoursRemaining,
              confirmation.appointmentId,
              true
            );
            results.emailsSent++;
          } catch (emailError) {
            results.emailErrors.push(
              `Reminder to pro: ${emailError instanceof Error ? emailError.message : "Unknown"}`
            );
          }
        }
      }
    }

    // =========================================
    // STEP 3: Process payouts (weekly only)
    // =========================================
    if (triggerType === "weekly-payout" || triggerType === "manual") {
      console.log("[CRON:PAYOUTS] Step 3: Processing payouts");

      const readyCycles = await getCyclesReadyForProcessing();
      console.log(`[CRON:PAYOUTS] Found ${readyCycles.length} cycles ready`);

      if (readyCycles.length > 0) {
        const payoutResults = await processAllReadyCycles();

        results.cyclesProcessed = payoutResults.cyclesProcessed;
        results.payoutsProcessed = payoutResults.totalPayoutsProcessed;
        results.payoutsFailed = payoutResults.totalPayoutsFailed;
        results.payoutErrors = payoutResults.errors;

        // Send payout emails
        for (const cycle of readyCycles) {
          const payouts = await prisma.payout.findMany({
            where: { cycleId: cycle.id },
            include: {
              professional: {
                include: {
                  applications: {
                    where: { status: "APPROVED" },
                    include: {
                      user: {
                        select: {
                          email: true,
                          name: true,
                          firstName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                },
              },
              cycle: true,
            },
          });

          for (const payout of payouts) {
            const proUser = payout.professional.applications[0]?.user;
            if (!proUser?.email) continue;

            const dateRange = formatCycleDateRange(
              payout.cycle.startDate,
              payout.cycle.endDate
            );

            try {
              if (payout.status === "completed") {
                await sendPayoutProcessedEmail(
                  proUser.email,
                  buildDisplayName(proUser),
                  payout.netTotal.toFixed(2),
                  payout.earningsCount,
                  payout.cycle.startDate.toLocaleDateString(),
                  payout.cycle.endDate.toLocaleDateString()
                );
                results.emailsSent++;
              } else if (payout.status === "failed") {
                await sendPayoutFailedEmail(
                  proUser.email,
                  buildDisplayName(proUser),
                  payout.netTotal.toFixed(2),
                  payout.failedReason || "Unknown error"
                );
                results.emailsSent++;
              }
            } catch (emailError) {
              results.emailErrors.push(
                `Payout email: ${emailError instanceof Error ? emailError.message : "Unknown"}`
              );
            }
          }
        }
      }
    }

    // =========================================
    // STEP 4: Ensure current cycle exists
    // =========================================
    await getOrCreateCurrentCycle();

    results.duration = Date.now() - startTime;

    console.log(`[CRON:PAYOUTS] Completed in ${results.duration}ms`);
    console.log("[CRON:PAYOUTS] Results:", JSON.stringify(results, null, 2));

    return NextResponse.json({
      success:
        results.confirmationErrors.length === 0 &&
        results.payoutErrors.length === 0,
      ...results,
    });
  } catch (error) {
    console.error("[CRON:PAYOUTS] Fatal error:", error);

    results.duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        ...results,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
