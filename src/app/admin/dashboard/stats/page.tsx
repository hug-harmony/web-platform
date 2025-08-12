"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart as BarChartIcon, Calendar } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const statsData = [
  { name: "Users", value: 150 },
  { name: "Specialists", value: 50 },
  { name: "Appointments", value: 200 },
  { name: "Reports", value: 10 },
];

const chartData = {
  labels: statsData.map((stat) => stat.name),
  datasets: [
    {
      label: "Hug Harmony Stats",
      data: statsData.map((stat) => stat.value),
      backgroundColor: "#F3CFC6",
      borderColor: "#C4C4C4",
      borderWidth: 1,
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: "#000000",
        font: { size: 14 },
      },
    },
    tooltip: {
      backgroundColor: "#C4C4C4",
      titleColor: "#000000",
      bodyColor: "#000000",
      borderColor: "#F3CFC6",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: "#000000" },
      grid: { display: false },
    },
    y: {
      ticks: { color: "#000000" },
      grid: { color: "#C4C4C4" },
    },
  },
};

export default function StatsPage() {
  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <BarChartIcon className="mr-2 h-6 w-6" />
            Hug Harmony App Stats
          </CardTitle>
          <p className="text-sm opacity-80">Analyze key metrics and trends.</p>
        </CardHeader>
      </Card>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Select date range..."
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Select date range"
            disabled
          />
        </div>
        <Button
          variant="outline"
          className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
        >
          Filter
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <motion.div key={stat.name} variants={itemVariants}>
            <Card className="hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  {stat.name}
                </h3>
                <p className="text-2xl font-bold text-[#F3CFC6]">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black dark:text-white">Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px]">
          <Bar data={chartData} options={chartOptions} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
