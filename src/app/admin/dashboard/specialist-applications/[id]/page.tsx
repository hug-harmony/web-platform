"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Application {
  id: string;
  name: string;
  location: string;
  biography: string;
  education: string;
  license: string;
  role: string;
  tags: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplication() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/specialists/application?id=${id}`, {
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error(errorData.error || "Failed to fetch application");
        }
        const data = await response.json();
        setApplication(data);
      } catch (err) {
        console.error("Error fetching application:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching the application"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchApplication();
  }, [id]);

  const updateStatus = async (
    status: "pending" | "reviewed" | "approved" | "rejected"
  ) => {
    try {
      const response = await fetch("/api/specialists/application", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(errorData.error || "Failed to update status");
      }
      const updatedApplication = await response.json();
      setApplication(updatedApplication);
    } catch (error) {
      console.error("Error updating status:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while updating the status"
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-center text-red-500">{error}</p>;
  }

  if (!application) {
    return <p className="p-4 text-center">Application not found.</p>;
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link
          href="/admin/dashboard/specialist-applications"
          className="hover:text-[#F3CFC6]"
        >
          Specialist Applications
        </Link>
        <span>/</span>
        <span>{application.name}</span>
      </div>

      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src="/assets/images/avatar-placeholder.png"
                alt={application.name}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {application.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <FileText className="mr-2 h-6 w-6" />
                {application.name}
              </CardTitle>
              <p className="text-sm opacity-80">Specialist Application</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-black dark:text-white">
              <strong>Role:</strong> {application.role}
            </p>
            <p className="text-black dark:text-white">
              <strong>Location:</strong> {application.location}
            </p>
            <p className="text-black dark:text-white">
              <strong>Biography:</strong> {application.biography}
            </p>
            <p className="text-black dark:text-white">
              <strong>Education:</strong> {application.education}
            </p>
            <p className="text-black dark:text-white">
              <strong>License:</strong> {application.license}
            </p>
            <p className="text-black dark:text-white">
              <strong>Tags:</strong> {application.tags}
            </p>
            <p className="text-black dark:text-white">
              <strong>Submitted:</strong>{" "}
              {new Date(application.createdAt).toLocaleDateString()}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={
                  application.status === "pending"
                    ? "text-yellow-500"
                    : application.status === "reviewed"
                      ? "text-green-500"
                      : application.status === "approved"
                        ? "text-blue-500"
                        : "text-red-500"
                }
              >
                {application.status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:bg-black/80 dark:hover:bg-gray-700"
              onClick={() => updateStatus("approved")}
              disabled={application.status === "approved"}
              aria-label="Approve application"
            >
              Approve
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:bg-black/80 dark:hover:bg-gray-700"
              onClick={() => updateStatus("rejected")}
              disabled={application.status === "rejected"}
              aria-label="Reject application"
            >
              Reject
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:bg-black/80 dark:hover:bg-gray-700"
              onClick={() => updateStatus("reviewed")}
              disabled={application.status === "reviewed"}
              aria-label="Mark as reviewed"
            >
              Mark as Reviewed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80 dark:bg-black/80 dark:hover:bg-gray-700"
      >
        <Link href="/admin/dashboard/specialist-applications">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link>
      </Button>
    </motion.div>
  );
}
