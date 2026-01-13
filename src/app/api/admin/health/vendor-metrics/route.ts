// src/app/api/admin/health/vendor-metrics/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { VendorMetricsData, VendorMetric } from "@/types/health";

// In production, implement actual health checks for each vendor
async function checkVendorHealth(vendorName: string): Promise<VendorMetric> {
    // Simulated vendor health data - replace with actual API health checks
    const vendors: Record<string, Partial<VendorMetric>> = {
        "AWS S3": {
            avgResponseTime: 45,
            uptime: 99.99,
            errorCount: 2,
            successCount: 15420,
            latency: { p50: 35, p95: 85, p99: 150 },
        },
        "AWS Chime": {
            avgResponseTime: 180,
            uptime: 99.95,
            errorCount: 8,
            successCount: 4200,
            latency: { p50: 120, p95: 280, p99: 450 },
        },
        "Stripe Payments": {
            avgResponseTime: 320,
            uptime: 99.98,
            errorCount: 5,
            successCount: 8500,
            latency: { p50: 250, p95: 480, p99: 720 },
        },
        "AWS SES (Email)": {
            avgResponseTime: 95,
            uptime: 99.97,
            errorCount: 3,
            successCount: 28000,
            latency: { p50: 70, p95: 150, p99: 280 },
        },
        "AWS SNS (Push)": {
            avgResponseTime: 85,
            uptime: 99.99,
            errorCount: 1,
            successCount: 62000,
            latency: { p50: 60, p95: 130, p99: 220 },
        },
        MongoDB: {
            avgResponseTime: 25,
            uptime: 99.99,
            errorCount: 0,
            successCount: 285000,
            latency: { p50: 15, p95: 45, p99: 85 },
        },
        "Google Geocoding": {
            avgResponseTime: 120,
            uptime: 99.96,
            errorCount: 12,
            successCount: 18500,
            latency: { p50: 90, p95: 180, p99: 320 },
        },
    };

    const vendorData = vendors[vendorName] || {
        avgResponseTime: 100,
        uptime: 99.9,
        errorCount: 0,
        successCount: 1000,
        latency: { p50: 80, p95: 150, p99: 250 },
    };

    // Add slight randomization to simulate real-time data
    const randomFactor = 0.9 + Math.random() * 0.2;
    const avgResponseTime = Math.round(
        (vendorData.avgResponseTime || 100) * randomFactor
    );

    // Determine status based on metrics
    let status: "operational" | "degraded" | "down" = "operational";
    const errorRate =
        (vendorData.errorCount || 0) /
        ((vendorData.successCount || 1) + (vendorData.errorCount || 0));
    if (errorRate > 0.01 || avgResponseTime > 500) {
        status = "degraded";
    }
    if (errorRate > 0.05 || avgResponseTime > 1000) {
        status = "down";
    }

    return {
        name: vendorName,
        status,
        avgResponseTime,
        uptime: vendorData.uptime || 99.9,
        lastChecked: new Date(),
        errorCount: vendorData.errorCount || 0,
        successCount: vendorData.successCount || 0,
        latency: vendorData.latency || { p50: 80, p95: 150, p99: 250 },
    };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const vendorNames = [
            "AWS S3",
            "AWS Chime",
            "Stripe Payments",
            "AWS SES (Email)",
            "AWS SNS (Push)",
            "MongoDB",
            "Google Geocoding",
        ];

        const vendors = await Promise.all(vendorNames.map(checkVendorHealth));

        // Determine overall status
        const downCount = vendors.filter((v) => v.status === "down").length;
        const degradedCount = vendors.filter((v) => v.status === "degraded").length;

        let overallStatus: "all_operational" | "partial_outage" | "major_outage" =
            "all_operational";
        if (degradedCount > 0 || downCount === 1) {
            overallStatus = "partial_outage";
        }
        if (downCount > 1) {
            overallStatus = "major_outage";
        }

        const response: VendorMetricsData = {
            vendors,
            overallStatus,
            timestamp: new Date(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Vendor metrics error:", error);
        return NextResponse.json(
            { error: "Failed to fetch vendor metrics" },
            { status: 500 }
        );
    }
}
