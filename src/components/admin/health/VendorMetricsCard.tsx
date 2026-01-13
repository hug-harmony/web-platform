"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Cloud,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    Activity,
} from "lucide-react";
import type { VendorMetricsData, VendorMetric } from "@/types/health";

interface VendorMetricsCardProps {
    data: VendorMetricsData | null;
    isLoading?: boolean;
}

export default function VendorMetricsCard({
    data,
    isLoading,
}: VendorMetricsCardProps) {
    if (isLoading) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Cloud className="h-5 w-5 text-[#F3CFC6]" />
                        Vendor Response Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Cloud className="h-5 w-5 text-[#F3CFC6]" />
                        Vendor Response Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const getStatusIcon = (status: VendorMetric["status"]) => {
        switch (status) {
            case "operational":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "degraded":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case "down":
                return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const getStatusBadge = (status: VendorMetric["status"]) => {
        switch (status) {
            case "operational":
                return <Badge className="bg-green-500 text-white">Operational</Badge>;
            case "degraded":
                return <Badge className="bg-yellow-500 text-white">Degraded</Badge>;
            case "down":
                return <Badge className="bg-red-500 text-white">Down</Badge>;
        }
    };

    const getOverallStatusBanner = () => {
        switch (data.overallStatus) {
            case "all_operational":
                return (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                            All Systems Operational
                        </span>
                    </div>
                );
            case "partial_outage":
                return (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                            Partial Service Degradation
                        </span>
                    </div>
                );
            case "major_outage":
                return (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-700 dark:text-red-400 font-medium">
                            Major Service Outage
                        </span>
                    </div>
                );
        }
    };

    return (
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                    <Cloud className="h-5 w-5 text-[#F3CFC6]" />
                    Vendor Response Metrics
                </CardTitle>
            </CardHeader>
            <CardContent>
                {getOverallStatusBanner()}

                <div className="space-y-4">
                    {data.vendors.map((vendor) => (
                        <div
                            key={vendor.name}
                            className="p-4 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 hover:border-[#F3CFC6] dark:hover:border-[#F3CFC6] transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(vendor.status)}
                                    <span className="font-medium text-black dark:text-white">
                                        {vendor.name}
                                    </span>
                                </div>
                                {getStatusBadge(vendor.status)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Avg Response
                                    </p>
                                    <p className="text-sm font-semibold text-black dark:text-white">
                                        {vendor.avgResponseTime}ms
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Activity className="h-3 w-3" /> Uptime
                                    </p>
                                    <p className="text-sm font-semibold text-black dark:text-white">
                                        {vendor.uptime}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Success/Error
                                    </p>
                                    <p className="text-sm font-semibold">
                                        <span className="text-green-600">{vendor.successCount.toLocaleString()}</span>
                                        {" / "}
                                        <span className="text-red-600">{vendor.errorCount}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Latency (p95)
                                    </p>
                                    <p className="text-sm font-semibold text-black dark:text-white">
                                        {vendor.latency.p95}ms
                                    </p>
                                </div>
                            </div>

                            {/* Latency Bar */}
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>p50: {vendor.latency.p50}ms</span>
                                    <span>p95: {vendor.latency.p95}ms</span>
                                    <span>p99: {vendor.latency.p99}ms</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full flex">
                                        <div
                                            className="bg-green-500"
                                            style={{
                                                width: `${(vendor.latency.p50 / vendor.latency.p99) * 100}%`,
                                            }}
                                        />
                                        <div
                                            className="bg-yellow-500"
                                            style={{
                                                width: `${((vendor.latency.p95 - vendor.latency.p50) / vendor.latency.p99) *
                                                    100
                                                    }%`,
                                            }}
                                        />
                                        <div
                                            className="bg-red-500"
                                            style={{
                                                width: `${((vendor.latency.p99 - vendor.latency.p95) / vendor.latency.p99) *
                                                    100
                                                    }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-400 mt-4 text-right">
                    Last updated: {new Date(data.timestamp).toLocaleTimeString()}
                </p>
            </CardContent>
        </Card>
    );
}
