"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  User,
  Calendar,
  Video,
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  Star,
  DollarSign,
  Clock,
  TrendingUp,
  MessageSquare,
  Shield,
  FileText,
  Eye,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface Professional {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  reviewCount: number | null;
  rate: number | null;
  biography: string | null;
  location: string | null;
  venue: "host" | "visit" | "both" | null;
  companyCutPercentage: number | null;
  createdAt: string;
  payment: {
    stripeCustomerId: string | null;
    hasValidPaymentMethod: boolean;
    cardLast4: string | null;
    cardBrand: string | null;
    cardExpiryMonth: number | null;
    cardExpiryYear: number | null;
    paymentMethodAddedAt: string | null;
    paymentBlockedAt: string | null;
    paymentBlockReason: string | null;
    paymentAcceptanceMethods: string[];
  };
  linkedUser: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    profileImage: string | null;
    status: string;
    createdAt: string;
    lastOnline: string | null;
    emailVerified: boolean;
  } | null;
  application: {
    id: string;
    status: string;
    rate: number;
    venue: string;
    submittedAt: string | null;
    videoWatchedAt: string | null;
    quizPassedAt: string | null;
    createdAt: string;
    quizAttempts: Array<{
      id: string;
      score: number;
      passed: boolean;
      attemptedAt: string;
      nextEligibleAt: string | null;
    }>;
    videoWatch: {
      id: string;
      videoName: string;
      watchedSec: number;
      isCompleted: boolean;
      lastWatchedAt: string;
    } | null;
  } | null;
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
    cancelledAppointments: number;
    totalVideoSessions: number;
    totalProfileVisits: number;
    totalReviews: number;
    averageRating: number | null;
    totalEarnings: number;
    totalPlatformFees: number;
    netEarnings: number;
    totalProposals: number;
    pendingProposals: number;
    reportsReceived: number;
  };
  availability: Array<{
    id: string;
    dayOfWeek: number;
    slots: string[];
    breakDuration: number | null;
  }>;
  appointments: Array<{
    id: string;
    clientId: string | null;
    clientName: string;
    clientEmail: string | null;
    startTime: string;
    endTime: string;
    status: string;
    disputeStatus: string;
    disputeReason: string | null;
    rate: number | null;
    adjustedRate: number | null;
    venue: string | null;
    paymentStatus: string;
    paymentAmount: number | null;
    confirmation: {
      clientConfirmed: boolean | null;
      professionalConfirmed: boolean | null;
      finalStatus: string;
      isDisputed: boolean;
    } | null;
    createdAt: string;
  }>;
  videoSessions: Array<{
    id: string;
    meetingId: string;
    clientId: string;
    clientName: string;
    scheduledStart: string | null;
    actualStart: string | null;
    actualEnd: string | null;
    duration: number | null;
    status: string;
    endReason: string | null;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    reviewerId: string;
    reviewerName: string;
    reviewerImage: string | null;
    rating: number;
    feedback: string;
    createdAt: string;
  }>;
  discounts: Array<{
    id: string;
    name: string;
    rate: number;
    discount: number;
    createdAt: string;
  }>;
  earnings: Array<{
    id: string;
    appointmentId: string;
    cycleId: string;
    cycleStartDate: string | null;
    cycleEndDate: string | null;
    grossAmount: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    sessionDurationMinutes: number;
    hourlyRate: number;
    status: string;
    createdAt: string;
  }>;
  feeCharges: Array<{
    id: string;
    cycleId: string;
    cycleStartDate: string | null;
    cycleEndDate: string | null;
    totalGrossEarnings: number;
    platformFeePercent: number;
    amountToCharge: number;
    earningsCount: number;
    status: string;
    attemptCount: number;
    lastAttemptAt: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    chargedAt: string | null;
    chargedAmount: number | null;
    waivedAt: string | null;
    waivedReason: string | null;
    createdAt: string;
  }>;
  profileVisits: Array<{
    id: string;
    visitorId: string;
    visitorName: string;
    visitorImage: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    reporterId: string;
    reporterName: string;
    reporterEmail: string | null;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
  }>;
  proposals: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string | null;
    conversationId: string;
    startTime: string | null;
    endTime: string | null;
    venue: string | null;
    status: string;
    initiator: string;
    createdAt: string;
  }>;
  adminNotes: Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ProfessionalDetailPage() {
  const { id } = useParams();

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Professional>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfessionalData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/professionals/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch professional");
      }
      const data = await response.json();
      setProfessional(data);
      setEditData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load professional data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchProfessionalData();
  }, [id, fetchProfessionalData]);

  const handleSuspend = async () => {
    try {
      const response = await fetch(`/api/admin/professionals/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to suspend professional");
      }

      setSuspendDialogOpen(false);
      toast.success("Professional suspended");
      fetchProfessionalData();
    } catch (error) {
      console.error("Error suspending:", error);
      toast.error("Failed to suspend professional");
    }
  };

  const handleEditSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/admin/professionals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name,
          rate: editData.rate,
          biography: editData.biography,
          location: editData.location,
          venue: editData.venue,
          companyCutPercentage: editData.companyCutPercentage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update professional");
      }

      setEditDialogOpen(false);
      toast.success("Professional updated successfully");
      fetchProfessionalData();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Failed to update professional");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "approved":
      case "confirmed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100";
      case "upcoming":
      case "pending":
      case "scheduled":
      case "processing":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100";
      case "cancelled":
      case "failed":
      case "suspended":
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100";
      case "disputed":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  const getApplicationStatusInfo = (status: string | undefined) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      FORM_PENDING: {
        label: "Form Pending",
        color: "bg-gray-100 text-gray-800",
        icon: "📝",
      },
      FORM_SUBMITTED: {
        label: "Form Submitted",
        color: "bg-blue-100 text-blue-800",
        icon: "📋",
      },
      VIDEO_PENDING: {
        label: "Video Pending",
        color: "bg-yellow-100 text-yellow-800",
        icon: "🎥",
      },
      QUIZ_PENDING: {
        label: "Quiz Pending",
        color: "bg-orange-100 text-orange-800",
        icon: "❓",
      },
      QUIZ_PASSED: {
        label: "Quiz Passed",
        color: "bg-green-100 text-green-800",
        icon: "✅",
      },
      QUIZ_FAILED: {
        label: "Quiz Failed",
        color: "bg-red-100 text-red-800",
        icon: "❌",
      },
      ADMIN_REVIEW: {
        label: "Admin Review",
        color: "bg-purple-100 text-purple-800",
        icon: "👀",
      },
      APPROVED: {
        label: "Approved",
        color: "bg-green-100 text-green-800",
        icon: "✓",
      },
      REJECTED: {
        label: "Rejected",
        color: "bg-red-100 text-red-800",
        icon: "✗",
      },
      SUSPENDED: {
        label: "Suspended",
        color: "bg-red-100 text-red-800",
        icon: "🚫",
      },
    };

    return (
      statusMap[status || ""] || {
        label: status || "Unknown",
        color: "bg-gray-100 text-gray-800",
        icon: "❓",
      }
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-[#F3CFC6] border-t-transparent rounded-full"></div>
        <p className="mt-4 text-[#C4C4C4]">Loading professional details...</p>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Professional not found</p>
        <Button asChild>
          <Link href="/admin/dashboard/professionals">
            Back to Professionals
          </Link>
        </Button>
      </div>
    );
  }

  const appStatusInfo = getApplicationStatusInfo(
    professional.application?.status
  );

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4] mb-4">
        <Link
          href="/admin/dashboard/professionals"
          className="hover:text-[#F3CFC6]"
        >
          Professionals
        </Link>
        <span>/</span>
        <span>{professional.name}</span>
      </div>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarImage
                  src={
                    professional.image ||
                    "/assets/images/avatar-placeholder.png"
                  }
                  alt={professional.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white text-black text-2xl font-bold">
                  {professional.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <Briefcase className="h-6 w-6" />
                  {professional.name}
                </CardTitle>
                {professional.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      {professional.rating.toFixed(1)}
                    </span>
                    <span className="text-sm opacity-80">
                      ({professional.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}
                <p className="text-sm opacity-80 mt-1">
                  Professional since {formatDate(professional.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setEditDialogOpen(true)}
                variant="outline"
                className="border-white text-black hover:bg-white/80"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => setSuspendDialogOpen(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <p className="text-xs opacity-70">Hourly Rate</p>
              <p className="font-semibold text-lg">
                {professional.rate
                  ? formatCurrency(professional.rate)
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Platform Fee</p>
              <p className="font-semibold">
                {professional.companyCutPercentage || 0}%
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Venue Type</p>
              <p className="font-semibold capitalize">
                {professional.venue || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Total Earnings</p>
              <p className="font-semibold">
                {formatCurrency(professional.stats.totalEarnings)}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Completed Sessions</p>
              <p className="font-semibold">
                {professional.stats.completedAppointments}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Payment Status</p>
              <p
                className={`font-semibold ${professional.payment.hasValidPaymentMethod ? "text-green-600" : "text-red-600"}`}
              >
                {professional.payment.hasValidPaymentMethod
                  ? "✓ Active"
                  : "✗ No Card"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Status Card */}
      <Card className={appStatusInfo.color}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Application Status</h3>
              </div>
              <p className="text-sm opacity-90">{appStatusInfo.label}</p>
              {professional.application && (
                <div className="text-xs space-y-1 mt-2">
                  <p>
                    Submitted:{" "}
                    {formatDate(professional.application.submittedAt)}
                  </p>
                  <p>
                    Video Watched:{" "}
                    {formatDate(professional.application.videoWatchedAt)}
                  </p>
                  <p>
                    Quiz Passed:{" "}
                    {formatDate(professional.application.quizPassedAt)}
                  </p>
                </div>
              )}
            </div>
            <span className="text-3xl">{appStatusInfo.icon}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="details" className="p-6">
            <TabsList className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 grid w-full grid-cols-8">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="earnings"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Earnings
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="availability"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Availability
              </TabsTrigger>
              <TabsTrigger
                value="proposals"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Proposals
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Reports
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black text-xs"
              >
                Stats
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details">
              <div className="space-y-6 mt-4">
                {/* Professional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                      Professional Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#F3CFC6]" />
                        <span>Name: {professional.name}</span>
                      </div>
                      {professional.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                          <span>{professional.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#F3CFC6]" />
                        <span>
                          Rate:{" "}
                          {professional.rate
                            ? formatCurrency(professional.rate)
                            : "Not set"}
                          /hr
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[#F3CFC6]" />
                        <span className="capitalize">
                          Venue: {professional.venue || "Not set"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked User Info */}
                  {professional.linkedUser && (
                    <div>
                      <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                        Linked User Account
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#F3CFC6]" />
                          <span>{professional.linkedUser.email}</span>
                        </div>
                        {professional.linkedUser.phoneNumber && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#F3CFC6]" />
                            <span>{professional.linkedUser.phoneNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-[#F3CFC6]" />
                          <span
                            className={
                              professional.linkedUser.status === "active"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            Account: {professional.linkedUser.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#F3CFC6]" />
                          <span>
                            Last Online:{" "}
                            {formatDate(professional.linkedUser.lastOnline)}
                          </span>
                        </div>
                        <Link
                          href={`/admin/dashboard/users/${professional.linkedUser.id}`}
                          className="text-[#F3CFC6] hover:underline inline-block mt-2"
                        >
                          View Full User Profile →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Biography */}
                {professional.biography && (
                  <div className="pt-4 border-t border-[#C4C4C4]">
                    <h3 className="font-semibold mb-2 text-[#F3CFC6]">
                      Biography
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {professional.biography}
                    </p>
                  </div>
                )}

                {/* Payment Info */}
                <div className="pt-4 border-t border-[#C4C4C4]">
                  <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                    Payment Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-[#C4C4C4]">Card on File</p>
                      <p className="font-semibold">
                        {professional.payment.cardBrand &&
                        professional.payment.cardLast4
                          ? `${professional.payment.cardBrand.toUpperCase()} ****${professional.payment.cardLast4}`
                          : "No card"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#C4C4C4]">Card Expiry</p>
                      <p className="font-semibold">
                        {professional.payment.cardExpiryMonth &&
                        professional.payment.cardExpiryYear
                          ? `${professional.payment.cardExpiryMonth}/${professional.payment.cardExpiryYear}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#C4C4C4]">Payment Status</p>
                      <p
                        className={`font-semibold ${professional.payment.hasValidPaymentMethod ? "text-green-600" : "text-red-600"}`}
                      >
                        {professional.payment.hasValidPaymentMethod
                          ? "Valid"
                          : "Invalid"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#C4C4C4]">Blocked</p>
                      <p
                        className={`font-semibold ${professional.payment.paymentBlockedAt ? "text-red-600" : "text-green-600"}`}
                      >
                        {professional.payment.paymentBlockedAt
                          ? `Yes - ${professional.payment.paymentBlockReason}`
                          : "No"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                {professional.adminNotes.length > 0 && (
                  <div className="pt-4 border-t border-[#C4C4C4]">
                    <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                      Admin Notes
                    </h3>
                    <div className="space-y-3">
                      {professional.adminNotes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-gray-50 dark:bg-gray-800 p-3 rounded"
                        >
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-[#C4C4C4] mt-1">
                            By {note.authorName} on {formatDate(note.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <div className="mt-4">
                {professional.appointments.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    <AnimatePresence>
                      {professional.appointments.map((appt) => (
                        <motion.div
                          key={appt.id}
                          variants={itemVariants}
                          className="p-4 border border-[#C4C4C4] rounded hover:bg-[#F3CFC6]/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#F3CFC6]" />
                                <span className="font-semibold">
                                  {appt.clientName}
                                </span>
                                {appt.clientEmail && (
                                  <span className="text-xs text-[#C4C4C4]">
                                    ({appt.clientEmail})
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#C4C4C4]">
                                {formatDate(appt.startTime)} -{" "}
                                {formatDate(appt.endTime)}
                              </p>
                              <div className="flex gap-4 text-sm">
                                <span>
                                  <span className="text-[#C4C4C4]">Venue:</span>{" "}
                                  {appt.venue || "N/A"}
                                </span>
                                <span>
                                  <span className="text-[#C4C4C4]">Rate:</span>{" "}
                                  {appt.rate
                                    ? formatCurrency(appt.rate)
                                    : "N/A"}
                                </span>
                                <span>
                                  <span className="text-[#C4C4C4]">
                                    Payment:
                                  </span>{" "}
                                  {appt.paymentStatus}
                                </span>
                              </div>
                              {appt.confirmation && (
                                <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                                  <span>
                                    Confirmation:{" "}
                                    {appt.confirmation.finalStatus}
                                  </span>
                                  {appt.confirmation.isDisputed && (
                                    <span className="ml-2 text-red-600">
                                      (Disputed)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-2">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(appt.status)}`}
                              >
                                {appt.status}
                              </span>
                              {appt.disputeStatus !== "none" && (
                                <p className="text-xs text-red-600">
                                  Dispute: {appt.disputeStatus}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    No appointments found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings">
              <div className="space-y-6 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(professional.stats.totalEarnings)}
                      </p>
                      <p className="text-xs text-[#C4C4C4]">Total Earnings</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-6 w-6 mx-auto text-red-600 mb-2" />
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(professional.stats.totalPlatformFees)}
                      </p>
                      <p className="text-xs text-[#C4C4C4]">Platform Fees</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(professional.stats.netEarnings)}
                      </p>
                      <p className="text-xs text-[#C4C4C4]">Net Earnings</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 dark:bg-purple-900/20">
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-600">
                        {professional.stats.completedAppointments}
                      </p>
                      <p className="text-xs text-[#C4C4C4]">
                        Completed Sessions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Fee Charges */}
                <div>
                  <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                    Fee Charges
                  </h3>
                  {professional.feeCharges.length > 0 ? (
                    <div className="space-y-3">
                      {professional.feeCharges.map((fc) => (
                        <div
                          key={fc.id}
                          className="p-4 border border-[#C4C4C4] rounded"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">
                                Cycle: {formatDate(fc.cycleStartDate)} -{" "}
                                {formatDate(fc.cycleEndDate)}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                {fc.earningsCount} sessions •{" "}
                                {formatCurrency(fc.totalGrossEarnings)} gross •{" "}
                                {fc.platformFeePercent}% fee
                              </p>
                              <p className="text-sm font-semibold mt-1">
                                Amount to Charge:{" "}
                                {formatCurrency(fc.amountToCharge)}
                              </p>
                              {fc.failureMessage && (
                                <p className="text-sm text-red-600 mt-1">
                                  Error: {fc.failureMessage}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(fc.status)}`}
                            >
                              {fc.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#C4C4C4] text-center py-4">
                      No fee charges yet
                    </p>
                  )}
                </div>

                {/* Individual Earnings */}
                <div>
                  <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                    Recent Earnings
                  </h3>
                  {professional.earnings.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {professional.earnings.map((earning) => (
                        <div
                          key={earning.id}
                          className="p-3 border border-[#C4C4C4] rounded text-sm"
                        >
                          <div className="flex justify-between">
                            <div>
                              <p>
                                {formatCurrency(earning.grossAmount)} gross •{" "}
                                {formatCurrency(earning.platformFeeAmount)} fee
                              </p>
                              <p className="text-xs text-[#C4C4C4]">
                                {earning.sessionDurationMinutes} min @{" "}
                                {formatCurrency(earning.hourlyRate)}/hr
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(earning.status)}`}
                            >
                              {earning.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#C4C4C4] text-center py-4">
                      No earnings recorded
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <div className="mt-4">
                {professional.reviews.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {professional.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 border border-[#C4C4C4] rounded"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.reviewerImage || ""} />
                            <AvatarFallback>
                              {review.reviewerName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">
                                {review.reviewerName}
                              </p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm mt-2">{review.feedback}</p>
                            <p className="text-xs text-[#C4C4C4] mt-2">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    No reviews yet
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <div className="mt-4">
                {professional.availability.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {professional.availability
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((avail) => (
                        <div
                          key={avail.id}
                          className="p-4 border border-[#C4C4C4] rounded"
                        >
                          <h4 className="font-semibold text-[#F3CFC6] mb-2">
                            {dayNames[avail.dayOfWeek]}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {avail.slots.map((slot, idx) => (
                              <span
                                key={idx}
                                className="bg-[#F3CFC6]/20 px-2 py-1 rounded text-sm"
                              >
                                {slot}
                              </span>
                            ))}
                          </div>
                          {avail.breakDuration && (
                            <p className="text-xs text-[#C4C4C4] mt-2">
                              Break: {avail.breakDuration} min
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    No availability set
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Proposals Tab */}
            <TabsContent value="proposals">
              <div className="mt-4">
                {professional.proposals.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {professional.proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="p-4 border border-[#C4C4C4] rounded"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {proposal.userName}
                              {proposal.userEmail && (
                                <span className="text-xs text-[#C4C4C4] ml-2">
                                  ({proposal.userEmail})
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[#C4C4C4]">
                              {proposal.startTime && proposal.endTime
                                ? `${formatDate(proposal.startTime)} - ${formatDate(proposal.endTime)}`
                                : "Time not set"}
                            </p>
                            <p className="text-sm">
                              <span className="text-[#C4C4C4]">Venue:</span>{" "}
                              {proposal.venue || "N/A"}
                              <span className="text-[#C4C4C4] ml-4">
                                Initiated by:
                              </span>{" "}
                              {proposal.initiator}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(proposal.status)}`}
                          >
                            {proposal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    No proposals found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <div className="mt-4">
                {professional.reports.length > 0 ? (
                  <div className="space-y-3">
                    {professional.reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 border border-red-300 rounded bg-red-50 dark:bg-red-900/20"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              Reported by: {report.reporterName}
                            </p>
                            <p className="text-sm text-[#C4C4C4]">
                              {report.reporterEmail}
                            </p>
                            <p className="text-sm mt-2">
                              <span className="font-semibold">Reason:</span>{" "}
                              {report.reason}
                            </p>
                            {report.details && (
                              <p className="text-sm mt-1">
                                <span className="font-semibold">Details:</span>{" "}
                                {report.details}
                              </p>
                            )}
                            <p className="text-xs text-[#C4C4C4] mt-2">
                              {formatDate(report.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(report.status)}`}
                          >
                            {report.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-green-600">
                    ✓ No reports against this professional
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-[#F3CFC6] mb-2" />
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {professional.stats.totalAppointments}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Total Appointments</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-100/50 dark:bg-green-900/20">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {professional.stats.completedAppointments}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Completed</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-100/50 dark:bg-blue-900/20">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {professional.stats.upcomingAppointments}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Upcoming</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-100/50 dark:bg-red-900/20">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-red-600 mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {professional.stats.cancelledAppointments}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Cancelled</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <Video className="h-6 w-6 mx-auto text-[#F3CFC6] mb-2" />
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {professional.stats.totalVideoSessions}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Video Sessions</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <Eye className="h-6 w-6 mx-auto text-[#F3CFC6] mb-2" />
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {professional.stats.totalProfileVisits}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Profile Visits</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <Star className="h-6 w-6 mx-auto text-[#F3CFC6] mb-2" />
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {professional.stats.averageRating?.toFixed(1) || "N/A"}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">
                      Avg Rating ({professional.stats.totalReviews} reviews)
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-6 w-6 mx-auto text-[#F3CFC6] mb-2" />
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {professional.stats.totalProposals}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">
                      Proposals ({professional.stats.pendingProposals} pending)
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button
        asChild
        variant="outline"
        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/10"
      >
        <Link href="/admin/dashboard/professionals">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Professionals
        </Link>
      </Button>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-[#C4C4C4] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#F3CFC6] dark:text-[#F3CFC6]">
              Edit Professional
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-[#C4C4C4]">
              Update professional information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Name
              </label>
              <Input
                value={editData.name || ""}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Hourly Rate ($)
              </label>
              <Input
                type="number"
                value={editData.rate || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Platform Fee (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editData.companyCutPercentage || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    companyCutPercentage: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Location
              </label>
              <Input
                value={editData.location || ""}
                onChange={(e) =>
                  setEditData({ ...editData, location: e.target.value })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Venue Type
              </label>
              <select
                value={editData.venue || "both"}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    venue: e.target.value as "host" | "visit" | "both",
                  })
                }
                className="mt-1 w-full bg-white dark:bg-gray-900 border border-[#C4C4C4] text-black dark:text-white rounded px-3 py-2 text-sm"
              >
                <option value="host">Host Only</option>
                <option value="visit">Visit Only</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Biography
              </label>
              <textarea
                value={editData.biography || ""}
                onChange={(e) =>
                  setEditData({ ...editData, biography: e.target.value })
                }
                className="mt-1 w-full bg-white dark:bg-gray-900 border border-[#C4C4C4] text-black dark:text-white rounded px-3 py-2 text-sm"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-[#C4C4C4] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isSaving}
              className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-red-300 dark:border-red-500 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500">
              Suspend Professional?
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-[#C4C4C4]">
              This will suspend {professional.name}&apos;s professional account
              and prevent them from receiving new appointments. Their user
              account will remain active. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                This action will:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <li>• Set application status to SUSPENDED</li>
                <li>• Hide profile from public listings</li>
                <li>• Prevent new appointment bookings</li>
                <li>• Keep existing appointments unchanged</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              className="border-gray-300 dark:border-[#C4C4C4] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Suspend Professional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
