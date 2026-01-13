// src/types/health.ts

export interface WebPerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  serverResponseTime: number;
  memoryUsage?: number;
  timestamp: Date;
}

export interface ApiMetric {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  errorRate: number;
  requestCount: number;
  lastHour: number;
  last24Hours: number;
}

export interface ApiPerformanceData {
  metrics: ApiMetric[];
  overallHealth: "healthy" | "degraded" | "critical";
  avgResponseTime: number;
  totalRequests: number;
  errorRate: number;
  timestamp: Date;
}

export interface DataVolumeStats {
  totalUsers: number;
  totalProfessionals: number;
  totalAppointments: number;
  totalConversations: number;
  totalMessages: number;
  totalPayments: number;
  totalReviews: number;
  totalReports: number;
  timeSeriesData: TimeSeriesDataPoint[];
  growthRates: GrowthRates;
}

export interface TimeSeriesDataPoint {
  date: string;
  users: number;
  professionals: number;
  appointments: number;
  payments: number;
  messages: number;
}

export interface GrowthRates {
  usersGrowth: number;
  professionalsGrowth: number;
  appointmentsGrowth: number;
  paymentsGrowth: number;
  messagesGrowth: number;
}

export interface VendorMetric {
  name: string;
  status: "operational" | "degraded" | "down";
  avgResponseTime: number;
  uptime: number;
  lastChecked: Date;
  errorCount: number;
  successCount: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface VendorMetricsData {
  vendors: VendorMetric[];
  overallStatus: "all_operational" | "partial_outage" | "major_outage";
  timestamp: Date;
}

export interface HealthOverview {
  webPerformance: WebPerformanceMetrics;
  apiPerformance: ApiPerformanceData;
  dataVolume: DataVolumeStats;
  vendorMetrics: VendorMetricsData;
  systemStatus: "healthy" | "warning" | "critical";
  lastUpdated: Date;
}
