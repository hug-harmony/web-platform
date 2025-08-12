"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Application {
  id: string;
  applicant: string;
  details: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
}

const applications: Application[] = [
  {
    id: "app_1",
    applicant: "Dr. Alice Green",
    details: "Application for Therapist position with 5 years experience.",
    status: "pending",
  },
  {
    id: "app_2",
    applicant: "Dr. Bob White",
    details: "Application for Psychiatrist position with 8 years experience.",
    status: "reviewed",
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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const application =
    applications.find((app) => app.id === id) || applications[0]; // Fallback to first application if ID not found
  const [status, setStatus] = useState(application.status);

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link
          href="/admin/dashboard/specialist-applications"
          className="hover:text-[#F3CFC6]"
        >
          Specialist Applications
        </Link>
        <span>/</span>
        <span>{application.applicant}</span>
      </div>

      {/* Profile Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src="/assets/images/avatar-placeholder.png"
                alt={application.applicant}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {application.applicant[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <FileText className="mr-2 h-6 w-6" />
                {application.applicant}
              </CardTitle>
              <p className="text-sm opacity-80">Specialist Application</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-black dark:text-white">{application.details}</p>
            <p>
              Status:{" "}
              <span
                className={
                  status === "pending"
                    ? "text-yellow-500"
                    : status === "reviewed"
                      ? "text-green-500"
                      : status === "approved"
                        ? "text-blue-500"
                        : "text-red-500"
                }
              >
                {status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              onClick={() => setStatus("approved")}
              disabled={status === "approved"}
              aria-label="Approve application"
            >
              Approve
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              onClick={() => setStatus("rejected")}
              disabled={status === "rejected"}
              aria-label="Reject application"
            >
              Reject
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              onClick={() => setStatus("reviewed")}
              disabled={status === "reviewed"}
              aria-label="Mark as reviewed"
            >
              Mark as Reviewed
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
            <p>No additional documents or notes available.</p>
            {/* Placeholder for future content like uploaded documents or comments */}
          </div>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard/specialist-applications">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link>
      </Button>
    </motion.div>
  );
}
