"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    UserCheck,
    Calendar,
    MessageSquare,
    CreditCard,
    Star,
    Flag,
    Database,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import type { DataVolumeStats } from "@/types/health";

interface DataVolumeChartProps {
    data: DataVolumeStats | null;
    isLoading?: boolean;
}

export default function DataVolumeChart({ data, isLoading }: DataVolumeChartProps) {
    if (isLoading) {
        return (
            <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                        <Database className="h-5 w-5 text-[#F3CFC6]" />
                        Data Volume Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            ))}
                        </div>
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
                        <Database className="h-5 w-5 text-[#F3CFC6]" />
                        Data Volume Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const GrowthBadge = ({ growth }: { growth: number }) => {
        if (growth > 0) {
            return (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{growth}%
                </Badge>
            );
        } else if (growth < 0) {
            return (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {growth}%
                </Badge>
            );
        }
        return (
            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                0%
            </Badge>
        );
    };

    const stats = [
        {
            label: "Total Users",
            value: data.totalUsers,
            icon: <Users className="h-5 w-5" />,
            growth: data.growthRates.usersGrowth,
            color: "from-blue-500 to-blue-600",
        },
        {
            label: "Professionals",
            value: data.totalProfessionals,
            icon: <UserCheck className="h-5 w-5" />,
            growth: data.growthRates.professionalsGrowth,
            color: "from-purple-500 to-purple-600",
        },
        {
            label: "Appointments",
            value: data.totalAppointments,
            icon: <Calendar className="h-5 w-5" />,
            growth: data.growthRates.appointmentsGrowth,
            color: "from-green-500 to-green-600",
        },
        {
            label: "Messages",
            value: data.totalMessages,
            icon: <MessageSquare className="h-5 w-5" />,
            growth: data.growthRates.messagesGrowth,
            color: "from-orange-500 to-orange-600",
        },
        {
            label: "Payments",
            value: data.totalPayments,
            icon: <CreditCard className="h-5 w-5" />,
            growth: data.growthRates.paymentsGrowth,
            color: "from-emerald-500 to-emerald-600",
        },
        {
            label: "Reviews",
            value: data.totalReviews,
            icon: <Star className="h-5 w-5" />,
            growth: 0,
            color: "from-yellow-500 to-yellow-600",
        },
        {
            label: "Conversations",
            value: data.totalConversations,
            icon: <MessageSquare className="h-5 w-5" />,
            growth: 0,
            color: "from-pink-500 to-pink-600",
        },
        {
            label: "Reports",
            value: data.totalReports,
            icon: <Flag className="h-5 w-5" />,
            growth: 0,
            color: "from-red-500 to-red-600",
        },
    ];

    // Calculate max value for chart scaling
    const maxValue = Math.max(
        ...data.timeSeriesData.map((d) =>
            Math.max(d.users, d.appointments, d.payments, d.messages / 10)
        )
    );

    return (
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-[#333]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                    <Database className="h-5 w-5 text-[#F3CFC6]" />
                    Data Volume Statistics
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#252525] dark:to-[#1f1f1f] border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div
                                    className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}
                                >
                                    {stat.icon}
                                </div>
                                <GrowthBadge growth={stat.growth} />
                            </div>
                            <p className="text-2xl font-bold text-black dark:text-white">
                                {formatNumber(stat.value)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Time Series Chart (Simple Bar Chart) */}
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Daily Activity (Last 30 Days)
                    </h4>
                    <div className="relative h-48 flex items-end gap-1">
                        {data.timeSeriesData.slice(-30).map((point, index) => {
                            const normalizedHeight =
                                maxValue > 0
                                    ? Math.max((point.users + point.appointments + point.payments) / maxValue, 0.05)
                                    : 0.05;
                            return (
                                <div
                                    key={index}
                                    className="flex-1 group relative"
                                    title={`${point.date}: ${point.users} users, ${point.appointments} appointments, ${point.payments} payments`}
                                >
                                    <div
                                        className="w-full bg-gradient-to-t from-[#F3CFC6] to-[#F3CFC6]/60 rounded-t-sm hover:from-[#E8A8A2] hover:to-[#E8A8A2]/60 transition-colors cursor-pointer"
                                        style={{ height: `${normalizedHeight * 100}%` }}
                                    />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        {point.date}
                                        <br />
                                        Users: {point.users}
                                        <br />
                                        Appts: {point.appointments}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
