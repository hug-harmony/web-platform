// src/app/api/admin/health/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { HealthOverview, WebPerformanceMetrics } from "@/types/health";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Web Performance Metrics (simulated - in production, integrate with monitoring service)
        const webPerformance: WebPerformanceMetrics = {
            pageLoadTime: Math.random() * 2000 + 500, // 500-2500ms
            firstContentfulPaint: Math.random() * 1000 + 200, // 200-1200ms
            largestContentfulPaint: Math.random() * 2500 + 500, // 500-3000ms
            timeToInteractive: Math.random() * 3000 + 1000, // 1000-4000ms
            cumulativeLayoutShift: Math.random() * 0.2, // 0-0.2
            serverResponseTime: Math.random() * 300 + 50, // 50-350ms
            memoryUsage: Math.random() * 100, // percentage
            timestamp: new Date(),
        };

        // Get data volume stats
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

        // Calculate growth rates (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const [recentUsers, previousUsers] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma.user.count({
                where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
            }),
        ]);

        const usersGrowth =
            previousUsers > 0
                ? ((recentUsers - previousUsers) / previousUsers) * 100
                : recentUsers > 0
                    ? 100
                    : 0;

        // Determine overall system status
        let systemStatus: "healthy" | "warning" | "critical" = "healthy";
        if (webPerformance.serverResponseTime > 250) {
            systemStatus = "warning";
        }
        if (webPerformance.serverResponseTime > 500) {
            systemStatus = "critical";
        }

        const overview: HealthOverview = {
            webPerformance,
            apiPerformance: {
                metrics: [],
                overallHealth: "healthy",
                avgResponseTime: webPerformance.serverResponseTime,
                totalRequests: 0,
                errorRate: 0,
                timestamp: new Date(),
            },
            dataVolume: {
                totalUsers,
                totalProfessionals,
                totalAppointments,
                totalConversations,
                totalMessages,
                totalPayments,
                totalReviews,
                totalReports,
                timeSeriesData: [],
                growthRates: {
                    usersGrowth,
                    professionalsGrowth: 0,
                    appointmentsGrowth: 0,
                    paymentsGrowth: 0,
                    messagesGrowth: 0,
                },
            },
            vendorMetrics: {
                vendors: [],
                overallStatus: "all_operational",
                timestamp: new Date(),
            },
            systemStatus,
            lastUpdated: new Date(),
        };

        return NextResponse.json(overview);
    } catch (error) {
        console.error("Health check error:", error);
        return NextResponse.json(
            { error: "Failed to fetch health metrics" },
            { status: 500 }
        );
    }
}
