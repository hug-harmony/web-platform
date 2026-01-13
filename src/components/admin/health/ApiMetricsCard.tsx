"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Server, TrendingDown, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import type { ApiPerformanceData } from "@/types/health";

interface ApiMetricsCardProps {
    data: ApiPerformanceData | null;
    isLoading?: boolean;
}

export default function ApiMetricsCard({ data, isLoading }: ApiMetricsCardProps) {
    if (isLoading) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Server className="h-5 w-5 text-[#F3CFC6]" />
                        API Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
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
                        <Server className="h-5 w-5 text-[#F3CFC6]" />
                        API Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const getHealthBadge = (health: "healthy" | "degraded" | "critical") => {
        switch (health) {
            case "healthy":
                return (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Healthy
                    </Badge>
                );
            case "degraded":
                return (
                    <Badge className="bg-yellow-500 text-white flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Degraded
                    </Badge>
                );
            case "critical":
                return (
                    <Badge className="bg-red-500 text-white flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Critical
                    </Badge>
                );
        }
    };

    return (
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Server className="h-5 w-5 text-[#F3CFC6]" />
                        API Performance
                    </CardTitle>
                    {getHealthBadge(data.overallHealth)}
                </div>
            </CardHeader>
            <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {data.avgResponseTime}ms
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {(data.totalRequests / 1000).toFixed(1)}K
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {data.errorRate}%
                        </p>
                    </div>
                </div>

                {/* Endpoints Table */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-[#252525]">
                                <TableHead className="text-gray-700 dark:text-gray-300">Endpoint</TableHead>
                                <TableHead className="text-gray-700 dark:text-gray-300">Avg Time</TableHead>
                                <TableHead className="text-gray-700 dark:text-gray-300">Success Rate</TableHead>
                                <TableHead className="text-gray-700 dark:text-gray-300">Last Hour</TableHead>
                                <TableHead className="text-gray-700 dark:text-gray-300">Trend</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.metrics.map((metric) => (
                                <TableRow
                                    key={metric.endpoint}
                                    className="hover:bg-gray-50 dark:hover:bg-[#252525]"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {metric.method}
                                            </Badge>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {metric.endpoint}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`font-medium ${metric.avgResponseTime < 100
                                                    ? "text-green-600"
                                                    : metric.avgResponseTime < 300
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}
                                        >
                                            {metric.avgResponseTime}ms
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${metric.successRate >= 99
                                                            ? "bg-green-500"
                                                            : metric.successRate >= 95
                                                                ? "bg-yellow-500"
                                                                : "bg-red-500"
                                                        }`}
                                                    style={{ width: `${metric.successRate}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {metric.successRate}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400">
                                        {metric.lastHour.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {metric.lastHour > metric.last24Hours / 24 ? (
                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-red-500" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
