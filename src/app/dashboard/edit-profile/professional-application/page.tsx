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
import { Switch } from "@/components/ui/switch";

type VenueType = "host" | "visit" | "both";

interface ProfessionalApplication {
  rate: string;
  offersVideo: boolean;
  videoRate: string;
  venue: VenueType;
}

interface ExistingApplication {
  status: string;
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
  string,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    variant: "default" | "destructive";
    action?: { label: string; href: string };
  }
> = {
  VIDEO_PENDING: {
    title: "Continue to Video",
    description:
      "You have already submitted the form. Please watch the onboarding video.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    action: {
      label: "Watch Video",
      href: "/dashboard/edit-profile/professional-application/video",
    },
  },
  QUIZ_PENDING: {
    title: "Proceed to Quiz",
    description: "Complete the quiz to continue your application.",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    action: {
      label: "Take Quiz",
      href: "/dashboard/edit-profile/professional-application/quiz",
    },
  },
  QUIZ_FAILED: {
    title: "Quiz Cooldown",
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
    description: "Your application is being reviewed by our team.",
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
    description: "Your application was not approved. You may start a new one.",
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
    offersVideo: false,
    videoRate: "",
    venue: "both",
  });
  const [existingApplication, setExistingApplication] =
    useState<ExistingApplication | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [errors, setErrors] = useState<{ rate?: string; venue?: string }>({});

  const { data: session, status } = useSession();
  const router = useRouter();

  const checkExistingApplication = useCallback(async () => {
    try {
      const res = await fetch("/api/professionals/onboarding/status", {
        credentials: "include",
      });

      if (!res.ok) {
        setIsCheckingStatus(false);
        return;
      }

      const data = await res.json();

      if (!data.application) {
        setExistingApplication(null);
        setIsCheckingStatus(false);
        return;
      }

      setExistingApplication({
        status: data.step,
        professionalId: data.application.professionalId,
      });

      if (data.step !== "FORM_PENDING") {
        const redirectMap: Record<string, string> = {
          VIDEO_PENDING:
            "/dashboard/edit-profile/professional-application/video",
          QUIZ_PENDING: "/dashboard/edit-profile/professional-application/quiz",
          QUIZ_FAILED:
            "/dashboard/edit-profile/professional-application/quiz/cooldown",
          ADMIN_REVIEW:
            "/dashboard/edit-profile/professional-application/status",
          APPROVED: "/dashboard",
          REJECTED: "/dashboard/edit-profile/professional-application",
          SUSPENDED: "/dashboard/edit-profile/professional-application",
        };

        const target =
          redirectMap[data.step] ??
          "/dashboard/edit-profile/professional-application/status"; // Guaranteed string
        router.replace(target);
        return;
      }

      setIsCheckingStatus(false);
    } catch (error) {
      console.error("Error checking application status:", error);
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

    const { rate, offersVideo, videoRate, venue } = formData;

    try {
      const res = await fetch("/api/professionals/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate,
          offersVideo,
          videoRate: offersVideo ? videoRate : undefined,
          venue,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit application");
        return;
      }

      toast.success("Application submitted! Redirecting to video...");
      router.push("/dashboard/edit-profile/professional-application/video");
    } catch (error) {
      console.error(error);
      toast.error("Error submitting application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isCheckingStatus) {
    return <LoadingSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  const appStatus = existingApplication?.status;
  const statusConfig = appStatus ? STATUS_CONFIG[appStatus] : null;
  const showForm =
    !existingApplication ||
    appStatus === "FORM_PENDING" ||
    (appStatus && ["REJECTED", "SUSPENDED"].includes(appStatus));

  return (
    <motion.div
      className="p-4 space-y-6 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
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

      {statusConfig && (
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

      {showForm && (
        <Card className="shadow-lg">
          <CardContent className="space-y-6 pt-6">
            <motion.div variants={itemVariants} className="space-y-6">
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
                  className={`border-[#F3CFC6] focus:ring-[#F3CFC6] ${errors.rate ? "border-red-500" : ""
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

              {/* Video Sessions */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="offersVideo" className="text-base font-medium">Offer Video Sessions</Label>
                    <p className="text-sm text-muted-foreground">
                      Do you want to offer virtual sessions to clients?
                    </p>
                  </div>
                  <Switch
                    id="offersVideo"
                    checked={formData.offersVideo}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({
                        ...prev,
                        offersVideo: checked,
                        videoRate: checked ? prev.videoRate : ""
                      }))
                    }
                  />
                </div>

                {formData.offersVideo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 pt-2"
                  >
                    <Label htmlFor="videoRate">Video Hourly Rate ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="videoRate"
                        type="number"
                        placeholder="e.g. 80"
                        className="pl-7"
                        value={formData.videoRate}
                        onChange={(e) =>
                          setFormData({ ...formData, videoRate: e.target.value })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Typically, video sessions are offered at a lower rate than in-person sessions.
                    </p>
                  </motion.div>
                )}
              </div>

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
                    className={`border-[#F3CFC6] focus:ring-[#F3CFC6] ${errors.venue ? "border-red-500" : ""
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
              </div>

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
