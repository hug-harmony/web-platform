// src\app\admin\dashboard\users\[id]\page.tsx
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
  UserCheck,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import UserPhotoGallery from "@/components/admin/UserPhotoGallery";
import CompleteUserInfo from "@/components/admin/CompleteUserInfo";

interface User {
  id: string;
  name: string;
  username: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  status: "active" | "suspended";
  profileImage?: string;
  location?: string;
  biography?: string;
  createdAt: string;
  lastOnline: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  relationshipStatus?: string;
  orientation?: string;
  height?: string;
  ethnicity?: string;
  zodiacSign?: string;
  favoriteColor?: string;
  favoriteMedia?: string;
  petOwnership?: string;
  professionalApplication?: {
    status: string | null;
    professionalId: string | null;
  };
  stats?: {
    totalAppointments: number;
    totalPosts: number;
    conversationsCount: number;
    reportsSubmitted: number;
    profileVisits: number;
    reviewsGiven: number;
    surveyResponses: number;
  };
}

interface Appointment {
  _id: string;
  id?: string;
  professionalName: string;
  clientName: string;
  startTimeFormatted: string;
  status: "upcoming" | "completed" | "cancelled";
  rate: number;
  venue: string;
  disputeStatus: string;
  paymentStatus: string;
}

interface VideoSession {
  _id: string;
  id?: string;
  professionalName: string;
  startTimeFormatted: string;
  status: "upcoming" | "completed" | "cancelled";
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

const getProfessionalStatusInfo = (proApp: User["professionalApplication"]) => {
  if (!proApp?.status) {
    return {
      label: "Not Applied",
      color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
      icon: "📋",
      description: "User has not applied to become a professional",
    };
  }

  const status = proApp.status;

  if (proApp.professionalId) {
    return {
      label: "✓ Approved Professional",
      color:
        "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
      icon: "✅",
      description: "User is an approved professional",
    };
  }

  if (
    [
      "FORM_PENDING",
      "FORM_SUBMITTED",
      "VIDEO_PENDING",
      "QUIZ_PENDING",
      "ADMIN_REVIEW",
    ].includes(status)
  ) {
    const statusMap: Record<string, string> = {
      FORM_PENDING: "Waiting for form submission",
      FORM_SUBMITTED: "Form submitted, waiting for video review",
      VIDEO_PENDING: "Waiting for training video completion",
      QUIZ_PENDING: "Waiting for quiz attempt",
      ADMIN_REVIEW: "Under admin review",
    };
    return {
      label: "⏳ Pending Review",
      color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
      icon: "⏳",
      description: statusMap[status] || "Application pending",
    };
  }

  if (status === "QUIZ_FAILED") {
    return {
      label: "❌ Quiz Failed",
      color:
        "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
      icon: "❌",
      description: "User failed the professional quiz",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "🚫 Rejected",
      color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
      icon: "🚫",
      description: "Application was rejected",
    };
  }

  if (status === "SUSPENDED") {
    return {
      label: "🔴 Suspended",
      color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
      icon: "🔴",
      description: "Professional account is suspended",
    };
  }

  return {
    label: status,
    color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
    icon: "❓",
    description: `Status: ${status}`,
  };
};

export default function UserDetailPage() {
  const { id } = useParams();

  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user details
      const userResponse = await fetch(`/api/admin/users/${id}`);
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user");
      }
      const userData = await userResponse.json();
      setUser(userData);
      setEditData(userData);

      // Fetch appointments
      const apptResponse = await fetch(`/api/admin/appointments?userId=${id}`);
      if (apptResponse.ok) {
        const apptData = await apptResponse.json();
        setAppointments(apptData);
      }

      // Fetch video sessions
      const videoResponse = await fetch(
        `/api/admin/videoSessions?userId=${id}`
      );
      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        setVideoSessions(videoData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchUserData();
  }, [id, fetchUserData]);

  const handleStatusChange = async (newStatus: "active" | "suspended") => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSuspendDialogOpen(false);
      toast.success(
        `User ${newStatus === "active" ? "activated" : "suspended"}`
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleEditSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editData.firstName,
          lastName: editData.lastName,
          name: editData.name,
          phoneNumber: editData.phoneNumber,
          location: editData.location,
          biography: editData.biography,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditDialogOpen(false);
      toast.success("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100";
      case "upcoming":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-[#F3CFC6] border-t-transparent rounded-full"></div>
        <p className="mt-4 text-[#C4C4C4]">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">User not found</p>
        <Button asChild>
          <Link href="/admin/dashboard/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  const proStatusInfo = getProfessionalStatusInfo(user.professionalApplication);

  return (
    <motion.div
      className="space-y-6 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4] mb-4">
        <Link href="/admin/dashboard/users" className="hover:text-[#F3CFC6]">
          Users
        </Link>
        <span>/</span>
        <span>{user.name}</span>
      </div>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white">
                <AvatarImage
                  src={
                    user.profileImage || "/assets/images/avatar-placeholder.png"
                  }
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white text-black text-xl font-bold">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <User className="h-6 w-6" />
                  {user.name}
                  {user.isAdmin && (
                    <span className="text-sm bg-yellow-400/30 px-2 py-1 rounded">
                      ADMIN
                    </span>
                  )}
                </CardTitle>
                {user.username && (
                  <p className="text-sm opacity-80">@{user.username}</p>
                )}
                <p className="text-sm opacity-80">
                  Member since {formatDate(user.createdAt)}
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
              {user.status === "active" ? (
                <Button
                  onClick={() => setSuspendDialogOpen(true)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Suspend
                </Button>
              ) : (
                <Button
                  onClick={() => handleStatusChange("active")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs opacity-70">Email Verified</p>
              <p className="font-semibold">
                {user.emailVerified ? "✓ Yes" : "✗ No"}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Current Status</p>
              <p
                className={`font-semibold ${
                  user.status === "active" ? "text-white" : "text-red-400"
                }`}
              >
                {user.status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Total Appointments</p>
              <p className="font-semibold">
                {user.stats?.totalAppointments || 0}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Profile Visits</p>
              <p className="font-semibold">{user.stats?.profileVisits || 0}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Forum Activity</p>
              <p className="font-semibold">
                {(user.stats?.totalPosts || 0) +
                  (user.stats?.conversationsCount || 0)}{" "}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Status Card */}
      <Card className={proStatusInfo.color}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Professional Status</h3>
              </div>
              <p className="text-sm opacity-90">{proStatusInfo.description}</p>
            </div>
            <span className="text-3xl">{proStatusInfo.icon}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="details" className="p-6">
            <TabsList className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 grid w-full grid-cols-5">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
              >
                Appointments ({appointments.length})
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
              >
                Video Sessions ({videoSessions.length})
              </TabsTrigger>
              <TabsTrigger
                value="gallery"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
              >
                Gallery
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
              >
                Stats
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details">
              <div className="space-y-4 text-black dark:text-white mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#F3CFC6]" />
                        <span>Name: {user.name}</span>
                      </div>
                      {user.username && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#F3CFC6]" />
                          <span>Username: @{user.username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#F3CFC6]" />
                        <span>{user.email}</span>
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#F3CFC6]" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                      {user.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                          <span>{user.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 text-[#F3CFC6]">
                      Profile Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      {user.relationshipStatus && (
                        <p>
                          <span className="text-[#C4C4C4]">Relationship:</span>{" "}
                          {user.relationshipStatus}
                        </p>
                      )}
                      {user.orientation && (
                        <p>
                          <span className="text-[#C4C4C4]">Orientation:</span>{" "}
                          {user.orientation}
                        </p>
                      )}
                      {user.height && (
                        <p>
                          <span className="text-[#C4C4C4]">Height:</span>{" "}
                          {user.height}
                        </p>
                      )}
                      {user.ethnicity && (
                        <p>
                          <span className="text-[#C4C4C4]">Ethnicity:</span>{" "}
                          {user.ethnicity}
                        </p>
                      )}
                      {user.petOwnership && (
                        <p>
                          <span className="text-[#C4C4C4]">Pets:</span>{" "}
                          {user.petOwnership}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {user.biography && (
                  <div className="pt-4 border-t border-[#C4C4C4]">
                    <h3 className="font-semibold mb-2 text-[#F3CFC6]">
                      Biography
                    </h3>
                    <p className="text-sm leading-relaxed">{user.biography}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <div className="mt-4">
                {appointments.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <AnimatePresence>
                      {appointments.map((appt) => (
                        <motion.div
                          key={appt._id}
                          variants={itemVariants}
                          className="p-4 border border-[#C4C4C4] rounded hover:bg-[#F3CFC6]/5 dark:hover:bg-[#C4C4C4]/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#F3CFC6]" />
                                <span className="font-semibold text-black dark:text-white">
                                  {appt.professionalName}
                                </span>
                              </div>
                              <p className="text-sm text-[#C4C4C4]">
                                {appt.startTimeFormatted}
                              </p>
                              <p className="text-sm">
                                <span className="text-[#C4C4C4]">Venue:</span>{" "}
                                {appt.venue || "N/A"}
                              </p>
                              <p className="text-sm">
                                <span className="text-[#C4C4C4]">Rate:</span> $
                                {appt.rate.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right space-y-2">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                                  appt.status
                                )}`}
                              >
                                {appt.status}
                              </span>
                              <p className="text-xs text-[#C4C4C4]">
                                Payment: {appt.paymentStatus}
                              </p>
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

            {/* Video Sessions Tab */}
            <TabsContent value="videos">
              <div className="mt-4">
                {videoSessions.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <AnimatePresence>
                      {videoSessions.map((session) => (
                        <motion.div
                          key={session._id}
                          variants={itemVariants}
                          className="p-4 border border-[#C4C4C4] rounded hover:bg-[#F3CFC6]/5 dark:hover:bg-[#C4C4C4]/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-[#F3CFC6]" />
                                <span className="font-semibold text-black dark:text-white">
                                  {session.professionalName}
                                </span>
                              </div>
                              <p className="text-sm text-[#C4C4C4]">
                                {session.startTimeFormatted}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                                session.status
                              )}`}
                            >
                              {session.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    No video sessions found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              <div className="mt-4">
                <UserPhotoGallery userId={user.id} />
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.totalAppointments || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Appointments</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.totalPosts || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Forum Posts</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.profileVisits || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Profile Visits</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.conversationsCount || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Conversations</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.reportsSubmitted || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Reports Submitted</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#F3CFC6]/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#F3CFC6]">
                      {user.stats?.reviewsGiven || 0}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Reviews Given</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CompleteUserInfo userId={user.id} />

      {/* Back Button */}
      <Button
        asChild
        variant="outline"
        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/10"
      >
        <Link href="/admin/dashboard/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-[#C4C4C4] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#F3CFC6] dark:text-[#F3CFC6]">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-[#C4C4C4]">
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Username
              </label>
              <Input
                value={editData.username || ""}
                onChange={(e) =>
                  setEditData({ ...editData, username: e.target.value })
                }
                placeholder="username (if set)"
                disabled
                className="mt-1 bg-gray-100 dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Read-only - set by user
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                First Name
              </label>
              <Input
                value={editData.firstName || ""}
                onChange={(e) =>
                  setEditData({ ...editData, firstName: e.target.value })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Last Name
              </label>
              <Input
                value={editData.lastName || ""}
                onChange={(e) =>
                  setEditData({ ...editData, lastName: e.target.value })
                }
                className="mt-1 bg-white dark:bg-gray-900 border-[#C4C4C4] text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black dark:text-white">
                Phone
              </label>
              <Input
                value={editData.phoneNumber || ""}
                onChange={(e) =>
                  setEditData({ ...editData, phoneNumber: e.target.value })
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
                Biography
              </label>
              <textarea
                value={editData.biography || ""}
                onChange={(e) =>
                  setEditData({ ...editData, biography: e.target.value })
                }
                className="mt-1 w-full bg-white dark:bg-gray-900 border border-[#C4C4C4] text-black dark:text-white rounded px-3 py-2 text-sm"
                rows={3}
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
              Suspend User?
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-[#C4C4C4]">
              This will suspend {user.name}&apos;s account and prevent them from
              accessing the platform. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              className="border-gray-300 dark:border-[#C4C4C4] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusChange("suspended")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
