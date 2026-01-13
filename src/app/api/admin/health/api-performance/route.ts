// src/app/api/admin/health/api-performance/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ApiPerformanceData, ApiMetric } from "@/types/health";

// In production, replace with actual monitoring data from tools like
// DataDog, New Relic, or custom logging solutions
const simulatedApiMetrics: ApiMetric[] = [
    {
        endpoint: "/api/auth/*",
        method: "POST",
        avgResponseTime: 145,
        minResponseTime: 85,
        maxResponseTime: 420,
        successRate: 99.2,
        errorRate: 0.8,
        requestCount: 15420,
        lastHour: 245,
        last24Hours: 5840,
    },
    {
        endpoint: "/api/appointment/*",
        method: "GET",
        avgResponseTime: 78,
        minResponseTime: 25,
        maxResponseTime: 350,
        successRate: 99.8,
        errorRate: 0.2,
        requestCount: 28500,
        lastHour: 520,
        last24Hours: 12500,
    },
    {
        endpoint: "/api/professionals/*",
        method: "GET",
        avgResponseTime: 92,
        minResponseTime: 30,
        maxResponseTime: 280,
        successRate: 99.9,
        errorRate: 0.1,
        requestCount: 42000,
        lastHour: 780,
        last24Hours: 18200,
    },
    {
        endpoint: "/api/messages/*",
        method: "POST",
        avgResponseTime: 65,
        minResponseTime: 20,
        maxResponseTime: 200,
        successRate: 99.5,
        errorRate: 0.5,
        requestCount: 85000,
        lastHour: 1450,
        last24Hours: 35000,
    },
    {
        endpoint: "/api/payments/*",
        method: "POST",
        avgResponseTime: 320,
        minResponseTime: 150,
        maxResponseTime: 850,
        successRate: 98.5,
        errorRate: 1.5,
        requestCount: 8500,
        lastHour: 145,
        last24Hours: 3400,
    },
    {
        endpoint: "/api/users/*",
        method: "GET",
        avgResponseTime: 55,
        minResponseTime: 18,
        maxResponseTime: 180,
        successRate: 99.9,
        errorRate: 0.1,
        requestCount: 35000,
        lastHour: 620,
        last24Hours: 14800,
    },
    {
        endpoint: "/api/video/*",
        method: "POST",
        avgResponseTime: 280,
        minResponseTime: 120,
        maxResponseTime: 750,
        successRate: 97.8,
        errorRate: 2.2,
        requestCount: 4200,
        lastHour: 85,
        last24Hours: 1800,
    },
    {
        endpoint: "/api/notifications/*",
        method: "POST",
        avgResponseTime: 120,
        minResponseTime: 45,
        maxResponseTime: 380,
        successRate: 99.1,
        errorRate: 0.9,
        requestCount: 62000,
        lastHour: 1100,
        last24Hours: 26000,
    },
];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Add slight randomization to simulate real-time data
        const metrics = simulatedApiMetrics.map((metric) => ({
            ...metric,
            avgResponseTime: Math.round(
                metric.avgResponseTime * (0.9 + Math.random() * 0.2)
            ),
            lastHour: Math.round(metric.lastHour * (0.8 + Math.random() * 0.4)),
        }));

        const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0);
        const avgResponseTime =
            metrics.reduce((sum, m) => sum + m.avgResponseTime * m.requestCount, 0) /
            totalRequests;
        const errorRate =
            metrics.reduce((sum, m) => sum + m.errorRate * m.requestCount, 0) /
            totalRequests;

        let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
        if (avgResponseTime > 200 || errorRate > 2) {
            overallHealth = "degraded";
        }
        if (avgResponseTime > 500 || errorRate > 5) {
            overallHealth = "critical";
        }

        const response: ApiPerformanceData = {
            metrics,
            overallHealth,
            avgResponseTime: Math.round(avgResponseTime),
            totalRequests,
            errorRate: Math.round(errorRate * 100) / 100,
            timestamp: new Date(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("API performance metrics error:", error);
        return NextResponse.json(
            { error: "Failed to fetch API performance metrics" },
            { status: 500 }
        );
    }
}
