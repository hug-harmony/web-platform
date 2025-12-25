// src/app/dashboard/profile/[id]/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import ProfileHeader from "@/components/profile/ProfileHeader";
import AboutSection from "@/components/profile/AboutSection";
import { ProfessionalGallery } from "@/components/professionals/ProfessionalGallery";
import PersonalInfo from "@/components/profile/PersonalInfo";
import DiscountsSection from "@/components/profile/DiscountsSection";
import ReviewsSection from "@/components/profile/ReviewsSection";
import BlockDialog from "@/components/profile/BlockDialog";
import ReportDialog from "@/components/profile/ReportDialog";
import NoteDialog from "@/components/profile/NoteDialog";
import ReviewDialog from "@/components/profile/ReviewDialog";
import ViewAllReviewsDialog from "@/components/profile/ViewAllReviewsDialog";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";

import { useWebSocket } from "@/hooks/useWebSocket";
import { formatLastOnline } from "@/lib/formatLastOnline";
import type { Profile, ProfessionalProfile } from "@/types/profile";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Type guard
function isProfessional(profile: Profile): profile is ProfessionalProfile {
  return profile.type === "professional";
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time online status
  const [isProfileOnline, setIsProfileOnline] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  // Dialog states
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isViewAllReviewsOpen, setIsViewAllReviewsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Form states
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const profileId = params.id as string;

  // Determine target type and ID for blocking
  const targetType = profile
    ? isProfessional(profile)
      ? "professional"
      : "user"
    : null;
  const targetId = profile ? profile.id : null;

  // Get the user ID to track (for professionals, we need the userId, not the professional ID)
  const profileUserId = profile
    ? isProfessional(profile)
      ? profile.userId
      : profile.id
    : null;

  // WebSocket for real-time online status
  useWebSocket({
    enabled: !!session?.user && !!profileUserId,
    onOnlineStatusChange: useCallback(
      (userId: string, isOnline: boolean) => {
        if (userId === profileUserId || userId === profileId) {
          setIsProfileOnline(isOnline);
          if (!isOnline) {
            setLastOnlineTime(new Date());
          }
        }
      },
      [profileUserId, profileId]
    ),
  });

  // Fetch profile and block status
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (sessionStatus !== "authenticated") return;

    const fetchData = async () => {
      try {
        if (!profileId || !/^[0-9a-fA-F]{24}$/.test(profileId)) {
          setError("Invalid profile ID");
          setLoading(false);
          return;
        }

        const profileRes = await fetch(`/api/profiles/${profileId}`, {
          credentials: "include",
        });

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            router.push("/login");
            return;
          }
          if (profileRes.status === 404) {
            setError("Profile not found");
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        const data = await profileRes.json();
        setProfile(data);

        // Set initial online status
        if (data.lastOnline) {
          const lastOnline = new Date(data.lastOnline);
          setLastOnlineTime(lastOnline);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          setIsProfileOnline(lastOnline > fiveMinutesAgo);
        }

        // Check if this profile is blocked by current user
        if (session?.user?.id && data.id) {
          const blockRes = await fetch(
            `/api/blocks/${data.id}${isProfessional(data) ? "?targetType=professional" : ""}`
          );
          if (blockRes.ok) {
            const { isBlocked } = await blockRes.json();
            setIsBlocked(isBlocked);
          }
        }
      } catch (err) {
        console.error("Fetch data error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId, sessionStatus, router, session?.user?.id]);

  // Handle block/unblock
  const handleToggleBlock = async () => {
    if (!session?.user?.id || !targetId || !targetType) return;

    try {
      if (isBlocked) {
        // Unblock
        const res = await fetch(`/api/blocks/${targetId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType }),
        });

        if (!res.ok) throw new Error("Failed to unblock");

        setIsBlocked(false);
        toast.success("User unblocked");
      } else {
        // Block
        const res = await fetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, targetType }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to block");
        }

        setIsBlocked(true);
        toast.success("User blocked");
      }

      setIsBlockDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
    }
  };

  // Handle start chat
  const handleStartChat = useCallback(async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to start a chat");
      router.push("/login");
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded");
      return;
    }

    try {
      let recipientId = profile.id;

      if (isProfessional(profile)) {
        if (!profile.userId) {
          toast.error("This professional is not available for chat");
          return;
        }
        recipientId = profile.userId;
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start chat");
      }

      const conversation = await res.json();
      router.push(`/dashboard/messaging/${conversation.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start chat";
      console.error("Start chat error:", msg);
      toast.error(msg);
    }
  }, [session, profile, router]);

  // Handle submit review
  const handleSubmitReview = async () => {
    if (!isProfessional(profile!)) return;

    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: profile!.id,
          rating: selectedRating,
          feedback,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit review");
      }

      // Refresh profile
      const profileRes = await fetch(`/api/profiles/${profileId}`, {
        credentials: "include",
      });
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      setIsReviewDialogOpen(false);
      setSelectedRating(0);
      setFeedback("");
      toast.success("Review submitted successfully");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit review";
      setSubmitError(msg);
    }
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast.error("Please select a reason");
      return;
    }

    try {
      const res = await fetch("/api/reports/user-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isProfessional(profile!)
            ? { reportedProfessionalId: profile!.id }
            : { reportedUserId: profile!.id }),
          reason: reportReason,
          details: reportDetails,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit report");

      toast.success("Report submitted successfully");
      setIsReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (err) {
      console.error("Submit report error:", err);
      toast.error("Failed to submit report");
    }
  };

  // Handle submit note
  const handleSubmitNote = async () => {
    if (!noteContent) {
      toast.error("Please enter note content");
      return;
    }

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isProfessional(profile!)
            ? { targetProfessionalId: profile!.id }
            : { targetUserId: profile!.id }),
          content: noteContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save note");

      toast.success("Note saved successfully");
      setIsNoteOpen(false);
      setNoteContent("");
    } catch (err) {
      console.error("Submit note error:", err);
      toast.error("Failed to save note");
    }
  };

  // Render stars
  const renderStars = (
    rating: number,
    interactive = false,
    onSelect?: (val: number) => void
  ) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-6 w-6",
          interactive && "cursor-pointer",
          i < rating ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-300"
        )}
        onClick={interactive ? () => onSelect?.(i + 1) : undefined}
      />
    ));
  };

  // Loading state
  if (loading) {
    return <ProfileSkeleton />;
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error || "Profile not found"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Use real-time online status if available, otherwise use profile data
  const { text: lastOnlineText, isOnline: initialIsOnline } = formatLastOnline(
    lastOnlineTime || (profile.lastOnline ? new Date(profile.lastOnline) : null)
  );

  // Prefer real-time status over initial status
  const displayIsOnline = isProfileOnline || initialIsOnline;
  const displayOnlineText = isProfileOnline ? "Online" : lastOnlineText;

  const isPro = isProfessional(profile);

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <ProfileHeader
        profile={profile}
        displayIsOnline={displayIsOnline}
        displayOnlineText={displayOnlineText}
        isBlocked={isBlocked}
        setIsBlockDialogOpen={setIsBlockDialogOpen}
        setIsReportOpen={setIsReportOpen}
        setIsNoteOpen={setIsNoteOpen}
        handleStartChat={handleStartChat}
      />

      <BlockDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        isBlocked={isBlocked}
        profileName={profile.name}
        onConfirm={handleToggleBlock}
      />

      <ReportDialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        profile={profile}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        onSubmit={handleSubmitReport}
      />

      <NoteDialog
        open={isNoteOpen}
        onOpenChange={setIsNoteOpen}
        noteContent={noteContent}
        setNoteContent={setNoteContent}
        onSubmit={handleSubmitNote}
      />

      <AboutSection profile={profile} />

      {profile.photos && profile.photos.length > 0 && (
        <motion.div variants={itemVariants}>
          <ProfessionalGallery photos={profile.photos} name={profile.name} />
        </motion.div>
      )}

      <PersonalInfo profile={profile} />

      {isPro && profile.discounts && profile.discounts.length > 0 && (
        <DiscountsSection discounts={profile.discounts} />
      )}

      {isPro && (
        <ReviewsSection
          reviews={profile.reviews || []}
          setIsReviewDialogOpen={setIsReviewDialogOpen}
          setIsViewAllReviewsOpen={setIsViewAllReviewsOpen}
          renderStars={renderStars}
        />
      )}

      <ReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        selectedRating={selectedRating}
        setSelectedRating={setSelectedRating}
        feedback={feedback}
        setFeedback={setFeedback}
        submitError={submitError}
        onSubmit={handleSubmitReview}
        renderStars={renderStars}
      />

      {"reviews" in profile && (
        <ViewAllReviewsDialog
          open={isViewAllReviewsOpen}
          onOpenChange={setIsViewAllReviewsOpen}
          reviews={profile.reviews || []}
          renderStars={renderStars}
        />
      )}
    </motion.div>
  );
}
