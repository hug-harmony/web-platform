"use client";

import HealthDashboard from "@/components/admin/health/HealthDashboard";

export default function ApplicationHealthPage() {
    return <HealthDashboard autoRefresh={true} refreshInterval={60} />;
}
