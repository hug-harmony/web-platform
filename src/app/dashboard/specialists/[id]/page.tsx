/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mutate } from "swr";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface Profile {
  _id: string;
  name: string;
  role?: string;
  tags?: string;
  biography?: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  type: "professional";
  relationshipStatus?: string;
  orientation?: string;
  height?: string;
  ethnicity?: string;
  zodiacSign?: string;
  favoriteColor?: string;
  favoriteMedia?: string;
  petOwnership?: string;
  venue?: string;
}
interface Review {
  id: string;
  rating: number;
  feedback: string;
  reviewerId: string;
  reviewerName: string;
  createdAt: string;
}
interface Discount {
  id: string;
  name: string;
  rate: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
  professional: { id: string; name: string };
}
interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ProfessionalProfilePage: React.FC<Props> = ({ params }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const router = useRouter();
  const { status: sessionStatus, data: session } = useSession();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    const fetchProfileAndReviews = async () => {
      try {
        const { id } = await params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid ID format:", id);
          notFound();
        }

        const profileRes = await fetch(`/api/professionals?id=${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile({
            _id: data.id,
            name: data.name,
            role: data.role || "Licensed Therapist",
            tags: data.tags || "",
            biography: data.biography || "",
            image: data.image || "",
            location: data.location || "",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            rate: data.rate || 0,
            type: "professional",
            relationshipStatus: data.relationshipStatus || "",
            orientation: data.orientation || "",
            height: data.height || "",
            ethnicity: data.ethnicity || "",
            zodiacSign: data.zodiacSign || "",
            favoriteColor: data.favoriteColor || "",
            favoriteMedia: data.favoriteMedia || "",
            petOwnership: data.petOwnership || "",
            venue: data.venue || "",
          });
        } else {
          if (profileRes.status === 401) router.push("/login");
          if (profileRes.status === 404) notFound();
          throw new Error(`Failed to fetch professional: ${profileRes.status}`);
        }

        const reviewsRes = await fetch(`/api/reviews?professionalId=${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (reviewsRes.ok) setReviews(await reviewsRes.json());
        else throw new Error(`Failed to fetch reviews: ${reviewsRes.status}`);

        const discountsRes = await fetch(`/api/discounts/professional/${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (discountsRes.ok) setDiscounts(await discountsRes.json());
        else
          throw new Error(`Failed to fetch discounts: ${discountsRes.status}`);
      } catch (err: any) {
        console.error("Fetch Error:", err.message, err.stack);
        setError(
          "Failed to load profile, reviews, or discounts. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndReviews();
  }, [params, router, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    const recordVisit = async () => {
      try {
        const { id } = await params;
        const res = await fetch("/api/profile-visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId: id }),
        });
        if (res.ok) {
          // Revalidate all filter keys
          mutate(
            (key) =>
              typeof key === "string" &&
              key.startsWith("/api/profile-visits?filter=")
          );
        }
      } catch (error) {
        console.error("Error recording profile visit:", error);
      }
    };

    recordVisit();
  }, [params, sessionStatus]);

  const handleStartChat = async () => {
    if (sessionStatus === "loading") {
      toast.error("Please wait while we check your session");
      return;
    }
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
      const res = await fetch(`/api/professionals?id=${profile._id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load professional");
      }
      const data = await res.json();
      if (!data.userId) {
        toast.error("This professional is not available for chat");
        return;
      }

      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: data.userId }),
        credentials: "include",
      });
      if (!convRes.ok) {
        const err = await convRes.json();
        throw new Error(err.error || "Failed to start chat");
      }
      const conversation = await convRes.json();
      if (!conversation.id) throw new Error("Invalid conversation");
      router.push(`/dashboard/messaging/${conversation.id}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to start chat";
      console.error("Start chat error:", msg);
      toast.error(msg);
    }
  };

  const handleSubmitReview = async () => {
    setSubmitError(null);
    try {
      const { id } = await params;
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: id,
          rating: selectedRating,
          feedback,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit review");
      }
      const profileRes = await fetch(`/api/professionals?id=${id}`);
      if (profileRes.ok) setProfile(await profileRes.json());
      const reviewsRes = await fetch(`/api/reviews?professionalId=${id}`);
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      setIsReviewDialogOpen(false);
      setSelectedRating(0);
      setFeedback("");
    } catch (err: any) {
      setSubmitError(err.message);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast.error("Please select a reason");
      return;
    }
    try {
      const { id } = await params;
      const res = await fetch("/api/reports/user-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedProfessionalId: id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      toast.success("Report submitted successfully");
      setIsReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      console.error("Submit report error:", error);
      toast.error("Failed to submit report");
    }
  };

  const handleSubmitNote = async () => {
    if (!noteContent) {
      toast.error("Please enter note content");
      return;
    }
    try {
      const { id } = await params;
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetProfessionalId: id,
          content: noteContent,
        }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      toast.success("Note saved successfully");
      setIsNoteOpen(false);
      setNoteContent("");
    } catch (error) {
      console.error("Submit note error:", error);
      toast.error("Failed to save note");
    }
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onSelect?: (val: number) => void
  ) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-6 w-6 cursor-pointer",
          i < rating ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-300"
        )}
        onClick={interactive ? () => onSelect?.(i + 1) : undefined}
      />
    ));
  };

  if (loading)
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="shadow-lg pt-0 overflow-hidden">
          <div className="relative h-64 sm:h-80">
            <Skeleton className="absolute inset-0 bg-[#C4C4C4]/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F3CFC6]/30 to-[#C4C4C4]/30" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-24 w-full bg-[#C4C4C4]/50" />
            </div>
            <Skeleton className="h-6 w-32 mx-auto bg-[#C4C4C4]/50" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-10 rounded-full bg-[#C4C4C4]/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    );

  if (error || !profile)
    return (
      <div className="text-center p-6 text-red-500">
        {error || "Profile not found."}
      </div>
    );

  const validImageSrc = profile.image || "/register.jpg";
  const tagsArray = profile.tags
    ? profile.tags.split(",").map((tag) => tag.trim())
    : [];

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="shadow-lg pt-0 overflow-hidden">
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
          </div>
        </div>
        <CardContent className="pt-6 text-center">
          <motion.div variants={itemVariants} className="space-y-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
                {profile.name}
              </h2>
              {profile.role && (
                <p className="text-sm text-[#C4C4C4] mt-1">{profile.role}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[#C4C4C4]">
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.rating !== undefined && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#F3CFC6]" />
                  <span>
                    {profile.rating.toFixed(1)} ({profile.reviewCount || 0}{" "}
                    reviews)
                  </span>
                </div>
              )}
              {profile.venue && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-[#F3CFC6]" />
                  <span>
                    {profile.venue.charAt(0).toUpperCase() +
                      profile.venue.slice(1)}
                  </span>
                </div>
              )}
            </div>
            {tagsArray.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {tagsArray.slice(0, 4).map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-[#F3CFC6] text-black dark:text-white text-xs px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {tagsArray.length > 4 && (
                  <span className="bg-[#F3CFC6] text-black dark:text-white text-xs px-3 py-1 rounded-full">
                    +{tagsArray.length - 4} more
                  </span>
                )}
              </div>
            )}
            {profile.rate !== undefined && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black dark:text-white">
                  ${profile.rate}/session
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <Link href={`/dashboard/appointments/book/${profile._id}`}>
                      <Book className="mr-2 h-4 w-4" /> Book an in-person
                      meeting
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <Link href={`/dashboard/video-session/${profile._id}`}>
                      <Video className="mr-2 h-4 w-4" /> Book a virtual session
                    </Link>
                  </Button>
                  <Button
                    onClick={handleStartChat}
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Start Chat
                  </Button>
                  <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto">
                    <StarIcon className="mr-2 h-4 w-4" /> Save to Favourites
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 px-6 py-2 rounded-full w-full sm:w-auto"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-gray-800"
                    >
                      <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                        Block
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsReportOpen(true)}
                        className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                      >
                        Report
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsNoteOpen(true)}
                        className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                      >
                        Make a Note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
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

      <motion.div variants={itemVariants}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              About the Professional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile.biography && (
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-black dark:text-white">
                  Biography
                </h4>
                <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed">
                  {profile.biography}
                </p>
              </div>
            )}
            {profile.venue && (
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-black dark:text-white">
                  Venue Preference
                </h4>
                <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed">
                  {profile.venue.charAt(0).toUpperCase() +
                    profile.venue.slice(1) || "Not specified"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-black dark:text-white">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <p className="font-medium text-black dark:text-white">
                  Relationship Status
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.relationshipStatus || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Orientation
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.orientation || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">Height</p>
                <p className="text-[#C4C4C4]">
                  {profile.height || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Ethnicity
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.ethnicity || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Zodiac Sign
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.zodiacSign || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Favorite Color
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.favoriteColor || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Favorite Movie/TV Show
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.favoriteMedia || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  Pet Ownership
                </p>
                <p className="text-[#C4C4C4]">
                  {profile.petOwnership || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black dark:text-white">
              Available Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {discounts.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {discounts.map((discount) => (
                    <motion.div
                      key={discount.id}
                      variants={cardVariants}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors">
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
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="text-center text-[#C4C4C4]">
                No discounts available.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

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
            {reviews.length > 0 ? (
              <>
                <motion.div className="space-y-4" variants={containerVariants}>
                  <AnimatePresence>
                    {reviews.slice(0, 3).map((review) => (
                      <motion.div
                        key={review.id}
                        variants={cardVariants}
                        className="border-b pb-4 last:border-b-0"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-black dark:text-white">
                                {review.reviewerName}
                              </p>
                              <div className="flex">
                                {renderStars(review.rating)}
                              </div>
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
                    ))}
                  </AnimatePresence>
                </motion.div>
                {reviews.length > 3 && (
                  <Dialog open={isViewAllOpen} onOpenChange={setIsViewAllOpen}>
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
                          {reviews.map((review) => (
                            <motion.div
                              key={review.id}
                              variants={cardVariants}
                              className="border-b pb-4 last:border-b-0"
                            >
                              <div className="flex items-start space-x-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-semibold text-black dark:text-white">
                                      {review.reviewerName}
                                    </p>
                                    <div className="flex">
                                      {renderStars(review.rating)}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[#C4C4C4] mt-1">
                                    {new Date(
                                      review.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm sm:text-base text-black dark:text-white mt-2">
                                    {review.feedback}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
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
    </motion.div>
  );
};

export default ProfessionalProfilePage;
