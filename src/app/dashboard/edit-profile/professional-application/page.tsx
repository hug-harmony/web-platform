// app/dashboard/edit-profile/professional-application/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type VenueType = "host" | "visit" | "both";

interface ProfessionalApplication {
  rate: string;
  venue: VenueType;
}

type ApplicationStatus =
  | "none"
  | "FORM_PENDING"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

interface ExistingApplication {
  status: ApplicationStatus;
  professionalId: string | null;
}

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

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    variant: "default" | "destructive";
    action?: { label: string; href: string };
  }
> = {
  none: {
    title: "",
    description: "",
    icon: null,
    variant: "default",
  },
  FORM_PENDING: {
    title: "Application Started",
    description: "Complete the form below to continue.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
  },
  VIDEO_PENDING: {
    title: "Video Pending",
    description: "Please watch the onboarding video to continue.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    action: {
      label: "Watch Video",
      href: "/dashboard/edit-profile/professional-application/video",
    },
  },
  QUIZ_PENDING: {
    title: "Quiz Pending",
    description: "Complete the quiz to proceed with your application.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    action: {
      label: "Take Quiz",
      href: "/dashboard/edit-profile/professional-application/quiz",
    },
  },
  QUIZ_PASSED: {
    title: "Quiz Passed!",
    description: "Your application is being reviewed by our team.",
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    variant: "default",
    action: {
      label: "View Status",
      href: "/dashboard/edit-profile/professional-application/status",
    },
  },
  QUIZ_FAILED: {
    title: "Quiz Not Passed",
    description: "You can retake the quiz after the cooldown period.",
    icon: <XCircle className="h-4 w-4" />,
    variant: "destructive",
    action: {
      label: "Check Cooldown",
      href: "/dashboard/edit-profile/professional-application/quiz/cooldown",
    },
  },
  ADMIN_REVIEW: {
    title: "Under Review",
    description:
      "Your application is being reviewed. We'll notify you once complete.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    action: {
      label: "View Status",
      href: "/dashboard/edit-profile/professional-application/status",
    },
  },
  APPROVED: {
    title: "Application Approved!",
    description: "Congratulations! You're now a professional.",
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    variant: "default",
    action: { label: "Go to Dashboard", href: "/dashboard" },
  },
  REJECTED: {
    title: "Application Rejected",
    description: "Your application was not approved. You may reapply.",
    icon: <XCircle className="h-4 w-4" />,
    variant: "destructive",
  },
  SUSPENDED: {
    title: "Application Suspended",
    description: "Please contact support for more information.",
    icon: <XCircle className="h-4 w-4" />,
    variant: "destructive",
  },
};

export default function ProfessionalApplicationPage() {
  const [formData, setFormData] = useState<ProfessionalApplication>({
    rate: "",
    venue: "both",
  });
  const [existingApplication, setExistingApplication] =
    useState<ExistingApplication | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [errors, setErrors] = useState<{ rate?: string; venue?: string }>({});

  const { data: session, status } = useSession();
  const router = useRouter();

  // Check for existing application
  const checkExistingApplication = useCallback(async () => {
    try {
      const res = await fetch("/api/professionals/applications?.[0]?me=true", {
        credentials: "include",
      });

      if (res.ok) {
        const data: ExistingApplication = await res.json();
        setExistingApplication(data);

        // Auto-redirect based on status
        if (data.status === "VIDEO_PENDING") {
          router.push("/dashboard/edit-profile/professional-application/video");
        } else if (data.status === "QUIZ_PENDING") {
          router.push("/dashboard/edit-profile/professional-application/quiz");
        } else if (data.status === "APPROVED" && data.professionalId) {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error checking application status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "authenticated") {
      checkExistingApplication();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, checkExistingApplication, router]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { rate?: string; venue?: string } = {};

    if (!formData.rate) {
      newErrors.rate = "Rate is required";
    } else {
      const rateNum = parseFloat(formData.rate);
      if (isNaN(rateNum) || rateNum <= 0) {
        newErrors.rate = "Rate must be greater than 0";
      } else if (rateNum > 10000) {
        newErrors.rate = "Rate cannot exceed $10,000/hour";
      }
    }

    if (!formData.venue) {
      newErrors.venue = "Please select a venue option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!session?.user?.name) {
      toast.error("Please set your name in profile first.");
      router.push(`/dashboard/edit-profile/${session?.user?.id}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/professionals/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit application");
        if (res.status === 401) router.push("/login");
        return;
      }

      toast.success("Application submitted! Redirecting to video...");
      router.push(
        data.nextStep ||
          "/dashboard/edit-profile/professional-application/video"
      );
    } catch (error) {
      console.error(error);
      toast.error("Error submitting application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading states
  if (status === "loading" || isCheckingStatus) {
    return <LoadingSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  // Show existing application status
  const appStatus = existingApplication?.status || "none";
  const statusConfig = STATUS_CONFIG[appStatus];
  const showForm =
    appStatus === "none" ||
    appStatus === "FORM_PENDING" ||
    appStatus === "REJECTED";

  return (
    <motion.div
      className="p-4 space-y-6 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Become a Professional
            </CardTitle>
            <p className="text-sm text-black/70 mt-1">
              {showForm
                ? "Step 1: Submit your application"
                : "Application Status"}
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Status Alert for existing applications */}
      {appStatus !== "none" && statusConfig.title && (
        <motion.div variants={itemVariants}>
          <Alert variant={statusConfig.variant}>
            {statusConfig.icon}
            <AlertTitle>{statusConfig.title}</AlertTitle>
            <AlertDescription className="mt-2">
              {statusConfig.description}
              {statusConfig.action && (
                <Button asChild variant="link" className="p-0 h-auto ml-2">
                  <Link href={statusConfig.action.href}>
                    {statusConfig.action.label} →
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Application Form */}
      {showForm && (
        <Card className="shadow-lg">
          <CardContent className="space-y-6 pt-6">
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Rate Input */}
              <div className="space-y-2">
                <Label htmlFor="rate">
                  Hourly Rate ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rate"
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => {
                    setFormData({ ...formData, rate: e.target.value });
                    if (errors.rate) setErrors({ ...errors, rate: undefined });
                  }}
                  placeholder="50.00"
                  className={`border-[#F3CFC6] focus:ring-[#F3CFC6] ${
                    errors.rate ? "border-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
                {errors.rate && (
                  <p className="text-sm text-red-500">{errors.rate}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This is what clients will see as your hourly rate.
                </p>
              </div>

              {/* Venue Select */}
              <div className="space-y-2">
                <Label htmlFor="venue">
                  Service Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.venue}
                  onValueChange={(value: VenueType) => {
                    setFormData({ ...formData, venue: value });
                    if (errors.venue)
                      setErrors({ ...errors, venue: undefined });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="venue"
                    className={`border-[#F3CFC6] focus:ring-[#F3CFC6] ${
                      errors.venue ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select where you provide service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="host">
                      🏠 I host at my location
                    </SelectItem>
                    <SelectItem value="visit">🚗 I visit the client</SelectItem>
                    <SelectItem value="both">
                      ✨ Both (host and visit)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.venue && (
                  <p className="text-sm text-red-500">{errors.venue}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.venue === "host" &&
                    "Clients will come to your location for appointments."}
                  {formData.venue === "visit" &&
                    "You'll travel to the client's location for appointments."}
                  {formData.venue === "both" &&
                    "You can offer appointments at your location or travel to clients."}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !session?.user?.name}
                className="bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full w-full sm:w-auto min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit & Watch Video"
                )}
              </Button>

              {!session?.user?.name && (
                <p className="text-sm text-amber-600">
                  ⚠️ Please{" "}
                  <Link
                    href={`/dashboard/edit-profile/${session?.user?.id}`}
                    className="underline"
                  >
                    set your name in your profile
                  </Link>{" "}
                  before applying.
                </p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-40 rounded-full" />
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-48 rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
