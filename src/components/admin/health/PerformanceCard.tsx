"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Gauge, Zap, Monitor, TrendingUp } from "lucide-react";
import type { WebPerformanceMetrics } from "@/types/health";

interface PerformanceCardProps {
    metrics: WebPerformanceMetrics | null;
    isLoading?: boolean;
}

export default function PerformanceCard({
    metrics,
    isLoading,
}: PerformanceCardProps) {
    if (isLoading) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Monitor className="h-5 w-5 text-[#F3CFC6]" />
                        Web Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!metrics) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Monitor className="h-5 w-5 text-[#F3CFC6]" />
                        Web Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const getPerformanceStatus = (value: number, thresholds: { good: number; moderate: number }) => {
        if (value <= thresholds.good) return { label: "Good", color: "bg-green-500" };
        if (value <= thresholds.moderate) return { label: "Moderate", color: "bg-yellow-500" };
        return { label: "Poor", color: "bg-red-500" };
    };

    const performanceMetrics = [
        {
            label: "Page Load Time",
            value: `${Math.round(metrics.pageLoadTime)}ms`,
            icon: <Clock className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.pageLoadTime, { good: 1000, moderate: 2500 }),
        },
        {
            label: "First Contentful Paint",
            value: `${Math.round(metrics.firstContentfulPaint)}ms`,
            icon: <Zap className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.firstContentfulPaint, { good: 500, moderate: 1000 }),
        },
        {
            label: "Largest Contentful Paint",
            value: `${Math.round(metrics.largestContentfulPaint)}ms`,
            icon: <Activity className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.largestContentfulPaint, { good: 1500, moderate: 2500 }),
        },
        {
            label: "Time to Interactive",
            value: `${Math.round(metrics.timeToInteractive)}ms`,
            icon: <Gauge className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.timeToInteractive, { good: 2000, moderate: 3500 }),
        },
        {
            label: "Cumulative Layout Shift",
            value: metrics.cumulativeLayoutShift.toFixed(3),
            icon: <TrendingUp className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.cumulativeLayoutShift * 1000, { good: 100, moderate: 250 }),
        },
        {
            label: "Server Response Time",
            value: `${Math.round(metrics.serverResponseTime)}ms`,
            icon: <Activity className="h-4 w-4" />,
            status: getPerformanceStatus(metrics.serverResponseTime, { good: 100, moderate: 300 }),
        },
    ];

    return (
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                    <Monitor className="h-5 w-5 text-[#F3CFC6]" />
                    Web Performance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {performanceMetrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-[#F3CFC6]/20 text-[#F3CFC6]">
                                    {metric.icon}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {metric.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-black dark:text-white">
                                    {metric.value}
                                </span>
                                <Badge
                                    className={`${metric.status.color} text-white text-xs`}
                                >
                                    {metric.status.label}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
                {metrics.memoryUsage !== undefined && (
                    <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#F3CFC6]/10 to-[#C4C4C4]/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Memory Usage
                            </span>
                            <span className="text-sm font-semibold text-black dark:text-white">
                                {Math.round(metrics.memoryUsage)}%
                            </span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${metrics.memoryUsage < 60
                                        ? "bg-green-500"
                                        : metrics.memoryUsage < 80
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                    }`}
                                style={{ width: `${metrics.memoryUsage}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
