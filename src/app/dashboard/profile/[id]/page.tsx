// src/app/dashboard/profile/[id]/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  MapPin,
  Star,
  MoreVertical,
  StarIcon,
  Book,
  Video,
  DollarSign,
  MessageSquare,
  Home,
  Shield,
  User,
} from "lucide-react";

// Utils & Types
import { cn } from "@/lib/utils";
import { formatLastOnline } from "@/lib/formatLastOnline";
import { ProfessionalGallery } from "@/components/professionals/ProfessionalGallery";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  Profile,
  ProfessionalProfile,
  ProfileReview,
  ProfileDiscount,
} from "@/types/profile";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const cardVariants = {
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
        // Check if this status update is for the profile we're viewing
        if (userId === profileUserId || userId === profileId) {
          console.log(
            `Real-time online status update for profile: ${isOnline}`
          );
          setIsProfileOnline(isOnline);
          if (!isOnline) {
            setLastOnlineTime(new Date());
          }
        }
      },
      [profileUserId, profileId]
    ),
  });

  // Fetch profile
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (sessionStatus !== "authenticated") return;

    const fetchProfile = async () => {
      try {
        if (!profileId || !/^[0-9a-fA-F]{24}$/.test(profileId)) {
          setError("Invalid profile ID");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/profiles/${profileId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          if (res.status === 404) {
            setError("Profile not found");
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        setProfile(data);

        // Set initial online status from profile data
        if (data.lastOnline) {
          const lastOnline = new Date(data.lastOnline);
          setLastOnlineTime(lastOnline);
          // Consider online if last activity was within 5 minutes
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          setIsProfileOnline(lastOnline > fiveMinutesAgo);
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, sessionStatus, router]);

  // Start chat handler
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
      // For professionals, we need to get the linked user ID
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

  // Submit review handler (professionals only)
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

      // Refresh profile to get updated reviews
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

  // Submit report handler
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

  // Submit note handler
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

  const validImageSrc = profile.image || "/register.jpg";

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
      {/* Header Card */}
      <Card className="shadow-lg pt-0 overflow-hidden">
        {/* Hero Section */}
        <div className="relative h-64 sm:h-80">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${validImageSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(8px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F3CFC6]/30 to-[#C4C4C4]/30" />
          <div className="relative flex justify-center items-center h-full">
            <div className="relative">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-md">
                {profile.image ? (
                  <Image
                    src={validImageSrc}
                    alt={profile.name}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#C4C4C4]">
                    <span className="text-4xl text-black">
                      {profile.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {/* Online indicator on avatar */}
              <div
                className={cn(
                  "absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white",
                  displayIsOnline ? "bg-green-500" : "bg-gray-400"
                )}
                title={displayOnlineText}
              />
            </div>
          </div>
        </div>

        <CardContent className="pt-6 text-center">
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Name and Badge */}
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
                {profile.name}
              </h2>
              {isPro ? (
                <Badge className="bg-[#F3CFC6] text-black hover:bg-[#fff]/80">
                  <Shield className="w-3 h-3 mr-1" />
                  Professional
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <User className="w-3 h-3 mr-1" />
                  Member
                </Badge>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[#C4C4C4] flex-wrap">
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-300",
                    displayIsOnline
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "transition-colors duration-300",
                    displayIsOnline ? "text-green-600 font-medium" : ""
                  )}
                >
                  {displayOnlineText}
                </span>
              </div>
              {isPro && profile.rating !== undefined && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#F3CFC6]" />
                  <span>
                    {profile.rating.toFixed(1)} ({profile.reviewCount || 0}{" "}
                    reviews)
                  </span>
                </div>
              )}
              {isPro && profile.venue && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-[#F3CFC6]" />
                  <span>
                    {profile.venue.charAt(0).toUpperCase() +
                      profile.venue.slice(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Rate (Professional only) */}
            {isPro && profile.rate !== undefined && (
              <p className="text-lg font-semibold text-black dark:text-white">
                ${profile.rate}/session
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              {/* Booking buttons (Professional only) */}
              {isPro && (
                <>
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <Link href={`/dashboard/appointments/book/${profile.id}`}>
                      <Book className="mr-2 h-4 w-4" /> Book In-Person
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <Link
                      href={`/dashboard/appointments/book/${profile.id}?type=video`}
                    >
                      <Video className="mr-2 h-4 w-4" /> Book Virtual
                    </Link>
                  </Button>
                </>
              )}

              {/* Chat button (always shown) */}
              <Button
                onClick={handleStartChat}
                className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Start Chat
              </Button>

              {/* Favorites button */}
              <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto">
                <StarIcon className="mr-2 h-4 w-4" /> Save to Favourites
              </Button>

              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Block</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReportOpen(true)}>
                    Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNoteOpen(true)}>
                    Make a Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {isPro ? "Professional" : "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abuse">Abuse/Harassment</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="fake">Fake Account</SelectItem>
                  <SelectItem value="inappropriate">
                    Inappropriate Content
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                placeholder="Provide more details..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitReport} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="noteContent">Note</Label>
              <Textarea
                id="noteContent"
                placeholder="Write your note here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitNote} disabled={!noteContent}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About Section */}
      {profile.biography && (
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-black dark:text-white">
                About {isPro ? "the Professional" : profile.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-black dark:text-white">
                  Bio
                </h4>
                <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed">
                  {profile.biography}
                </p>
              </div>
              {isPro && profile.venue && (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-black dark:text-white">
                    Venue Preference
                  </h4>
                  <p className="text-sm sm:text-base text-black dark:text-white">
                    {profile.venue.charAt(0).toUpperCase() +
                      profile.venue.slice(1)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Photo Gallery */}
      {profile.photos && profile.photos.length > 0 && (
        <motion.div variants={itemVariants}>
          <ProfessionalGallery photos={profile.photos} name={profile.name} />
        </motion.div>
      )}

      {/* Personal Information */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-black dark:text-white">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <InfoItem
                label="Relationship Status"
                value={profile.relationshipStatus}
              />
              <InfoItem label="Orientation" value={profile.orientation} />
              <InfoItem label="Height" value={profile.height} />
              <InfoItem label="Ethnicity" value={profile.ethnicity} />
              <InfoItem label="Zodiac Sign" value={profile.zodiacSign} />
              <InfoItem label="Favorite Color" value={profile.favoriteColor} />
              <InfoItem
                label="Favorite Movie/TV Show"
                value={profile.favoriteMedia}
              />
              <InfoItem label="Pet Ownership" value={profile.petOwnership} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Discounts Section (Professional only) */}
      {isPro && profile.discounts && profile.discounts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-black dark:text-white">
                Available Discounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {profile.discounts.map((discount) => (
                    <DiscountCard key={discount.id} discount={discount} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reviews Section (Professional only) */}
      {isPro && (
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-xl font-bold text-black dark:text-white">
                  Reviews
                </h3>
                <Dialog
                  open={isReviewDialogOpen}
                  onOpenChange={setIsReviewDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-4 py-2 rounded-full w-full sm:w-auto">
                      Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Write Your Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Rating</Label>
                        <div className="flex">
                          {renderStars(selectedRating, true, setSelectedRating)}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="feedback">Feedback</Label>
                        <Textarea
                          id="feedback"
                          placeholder="Write your review here..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                      </div>
                      {submitError && (
                        <p className="text-red-500 text-sm">{submitError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={!selectedRating || !feedback}
                      >
                        Submit Review
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {profile.reviews && profile.reviews.length > 0 ? (
                <>
                  <motion.div
                    className="space-y-4"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {profile.reviews.slice(0, 3).map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          renderStars={renderStars}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {profile.reviews.length > 3 && (
                    <Dialog
                      open={isViewAllReviewsOpen}
                      onOpenChange={setIsViewAllReviewsOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="link"
                          className="text-[#F3CFC6] hover:text-[#C4C4C4] mt-4"
                        >
                          View All Reviews
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>All Reviews</DialogTitle>
                        </DialogHeader>
                        <motion.div
                          className="space-y-4"
                          variants={containerVariants}
                        >
                          <AnimatePresence>
                            {profile.reviews.map((review) => (
                              <ReviewCard
                                key={review.id}
                                review={review}
                                renderStars={renderStars}
                              />
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </DialogContent>
                    </Dialog>
                  )}
                </>
              ) : (
                <p className="text-center text-[#C4C4C4]">No reviews yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// Helper Components
function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="font-medium text-black dark:text-white">{label}</p>
      <p className="text-[#C4C4C4]">{value || "Not specified"}</p>
    </div>
  );
}

function DiscountCard({ discount }: { discount: ProfileDiscount }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 transition-colors">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-[#F3CFC6]" />
            <div>
              <h3 className="font-semibold">{discount.name}</h3>
              <p className="text-sm text-[#C4C4C4]">
                {discount.discount}% off ${discount.rate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReviewCard({
  review,
  renderStars,
}: {
  review: ProfileReview;
  renderStars: (rating: number) => React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="border-b pb-4 last:border-b-0"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-black dark:text-white">
              {review.reviewerName}
            </p>
            <div className="flex">{renderStars(review.rating)}</div>
          </div>
          <p className="text-sm text-[#C4C4C4] mt-1">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm sm:text-base text-black dark:text-white mt-2">
            {review.feedback}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="shadow-lg pt-0 overflow-hidden">
        <div className="relative h-64 sm:h-80">
          <Skeleton className="absolute inset-0 bg-[#C4C4C4]/50" />
          <div className="relative flex justify-center items-center h-full">
            <Skeleton className="w-40 h-40 rounded-full border-4 border-white bg-[#C4C4C4]/50" />
          </div>
        </div>
        <CardContent className="pt-6 space-y-4 text-center">
          <Skeleton className="h-8 w-64 mx-auto bg-[#C4C4C4]/50" />
          <Skeleton className="h-4 w-48 mx-auto bg-[#C4C4C4]/50" />
          <div className="flex justify-center gap-2">
            {[...Array(4)].map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-6 w-20 rounded-full bg-[#C4C4C4]/50"
              />
            ))}
          </div>
          <Skeleton className="h-20 w-full max-w-2xl mx-auto bg-[#C4C4C4]/50" />
          <div className="flex justify-center gap-4">
            {[...Array(4)].map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-10 w-40 rounded-full bg-[#C4C4C4]/50"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
