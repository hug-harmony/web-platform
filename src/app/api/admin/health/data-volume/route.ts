// src/app/api/admin/health/data-volume/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { DataVolumeStats, TimeSeriesDataPoint } from "@/types/health";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current totals
        const [
            totalUsers,
            totalProfessionals,
            totalAppointments,
            totalConversations,
            totalMessages,
            totalPayments,
            totalReviews,
            totalReports,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.professional.count(),
            prisma.appointment.count(),
            prisma.conversation.count(),
            prisma.message.count(),
            prisma.payment.count(),
            prisma.review.count(),
            prisma.report.count(),
        ]);

        // Generate time series data for the last 30 days
        const timeSeriesData: TimeSeriesDataPoint[] = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const [users, professionals, appointments, payments, messages] =
                await Promise.all([
                    prisma.user.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    }),
                    prisma.professional.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    }),
                    prisma.appointment.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    }),
                    prisma.payment.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    }),
                    prisma.message.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    }),
                ]);

            timeSeriesData.push({
                date: date.toISOString().split("T")[0],
                users,
                professionals,
                appointments,
                payments,
                messages,
            });
        }

        // Calculate growth rates (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const [
            recentUsers,
            previousUsers,
            recentProfessionals,
            previousProfessionals,
            recentAppointments,
            previousAppointments,
            recentPayments,
            previousPayments,
            recentMessages,
            previousMessages,
        ] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.user.count({
                where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
            prisma.professional.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.professional.count({
                where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
            prisma.appointment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.appointment.count({
                where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
            prisma.payment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.payment.count({
                where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
            prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.message.count({
                where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
        ]);

        const calculateGrowth = (recent: number, previous: number): number => {
            if (previous === 0) return recent > 0 ? 100 : 0;
            return Math.round(((recent - previous) / previous) * 100 * 10) / 10;
        };

        const response: DataVolumeStats = {
            totalUsers,
            totalProfessionals,
            totalAppointments,
            totalConversations,
            totalMessages,
            totalPayments,
            totalReviews,
            totalReports,
            timeSeriesData,
            growthRates: {
                usersGrowth: calculateGrowth(recentUsers, previousUsers),
                professionalsGrowth: calculateGrowth(
                    recentProfessionals,
                    previousProfessionals
                ),
                appointmentsGrowth: calculateGrowth(
                    recentAppointments,
                    previousAppointments
                ),
                paymentsGrowth: calculateGrowth(recentPayments, previousPayments),
                messagesGrowth: calculateGrowth(recentMessages, previousMessages),
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Data volume stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch data volume statistics" },
            { status: 500 }
        );
    }
}
