"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Report {
  id: string;
  reporter: string;
  reported: string;
  details: string;
  status: "open" | "closed";
}

const reports: Report[] = [
  {
    id: "rep_1",
    reporter: "John Doe",
    reported: "Jane Smith",
    details: "Inappropriate behavior in forum.",
    status: "open",
  },
  {
    id: "rep_2",
    reporter: "Alice Green",
    reported: "Bob White",
    details: "Harassment during video session.",
    status: "closed",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const report = reports.find((rep) => rep.id === id) || reports[0]; // Fallback to first report if ID not found
  const [status, setStatus] = useState(report.status);

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link href="/admin/dashboard/reports" className="hover:text-[#F3CFC6]">
          User Reports
        </Link>
        <span>/</span>
        <span>
          {report.reporter} vs {report.reported}
        </span>
      </div>

      {/* Report Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarImage
                  src="/assets/images/avatar-placeholder.png"
                  alt={report.reporter}
                />
                <AvatarFallback className="bg-[#C4C4C4] text-black">
                  {report.reporter[0]}
                </AvatarFallback>
              </Avatar>
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarImage
                  src="/assets/images/avatar-placeholder.png"
                  alt={report.reported}
                />
                <AvatarFallback className="bg-[#C4C4C4] text-black">
                  {report.reported[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <AlertCircle className="mr-2 h-6 w-6" />
                {report.reporter} vs {report.reported}
              </CardTitle>
              <p className="text-sm opacity-80">User Report</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-black dark:text-white">{report.details}</p>
            <p>
              Status:{" "}
              <span
                className={
                  status === "open" ? "text-yellow-500" : "text-green-500"
                }
              >
                {status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80"
              onClick={() => setStatus("closed")}
              disabled={status === "closed"}
              aria-label="Resolve report"
            >
              Resolve
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80"
              onClick={() => setStatus("open")}
              disabled={status === "open"}
              aria-label="Reopen report"
            >
              Reopen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Additional Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-black dark:text-white">
            <p>No additional evidence or comments available.</p>
            {/* Placeholder for future content like uploaded evidence or admin notes */}
          </div>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard/reports">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Link>
      </Button>
    </motion.div>
  );
}
