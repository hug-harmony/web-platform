/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  BookOpen,
  FileText,
  MoreVertical,
  StarIcon,
  Book,
  Video,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils"; // Assuming you have this utility from shadcn for class merging

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
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
  type: "specialist";
}

interface Review {
  id: string;
  rating: number;
  feedback: string;
  reviewerId: string;
  reviewerName: string;
  createdAt: string;
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SpecialistProfilePage: React.FC<Props> = ({ params }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const { status: sessionStatus } = useSession();

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

        // Fetch profile
        const profileRes = await fetch(`/api/specialists?id=${id}`, {
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
            type: "specialist",
          });
        } else {
          if (profileRes.status === 401) router.push("/login");
          if (profileRes.status === 404) notFound();
          throw new Error(`Failed to fetch specialist: ${profileRes.status}`);
        }

        // Fetch reviews
        const reviewsRes = await fetch(`/api/reviews?specialistId=${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        } else {
          throw new Error(`Failed to fetch reviews: ${reviewsRes.status}`);
        }
      } catch (err: any) {
        console.error("Fetch Error:", err.message, err.stack);
        setError("Failed to load profile or reviews. Please try again.");
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
        await fetch("/api/profile-visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specialistId: id }),
        });
      } catch (error) {
        console.error("Error recording profile visit:", error);
      }
    };

    recordVisit();
  }, [params, sessionStatus]);

  const handleSubmitReview = async () => {
    setSubmitError(null);
    try {
      const { id } = await params;
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialistId: id,
          rating: selectedRating,
          feedback,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit review");
      }
      // Refetch profile and reviews to update average rating and list
      const profileRes = await fetch(`/api/specialists?id=${id}`);
      if (profileRes.ok) setProfile(await profileRes.json());
      const reviewsRes = await fetch(`/api/reviews?specialistId=${id}`);
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      setIsReviewDialogOpen(false);
      setSelectedRating(0);
      setFeedback("");
    } catch (err: any) {
      setSubmitError(err.message);
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

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* Existing skeleton code... */}
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
  }

  if (error || !profile) {
    return (
      <div className="text-center p-6 text-red-500">
        {error || "Profile not found."}
      </div>
    );
  }

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
            <div className="flex items-center justify-center gap-2 text-[#C4C4C4]">
              {profile.location && (
                <>
                  <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                  <span>{profile.location}</span>
                </>
              )}
              {profile.rating !== undefined && (
                <>
                  <Star className="h-4 w-4 ml-4 text-[#F3CFC6]" />
                  <span>
                    {profile.rating.toFixed(1)} ({profile.reviewCount || 0}{" "}
                    reviews)
                  </span>
                </>
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
            {profile.biography && (
              <div className="max-w-2xl mx-auto text-black dark:text-white">
                <h3 className="text-lg font-semibold mb-2">Biography</h3>
                <p className="text-sm sm:text-base">{profile.biography}</p>
              </div>
            )}

            {profile.rate !== undefined && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black dark:text-white">
                  ${profile.rate}/session
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full"
                  >
                    <Link href={`/dashboard/appointments/book/${profile._id}`}>
                      <Book className="mr-2 h-4 w-4" /> book an in-person
                      meeting
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full"
                  >
                    <Link href={`/dashboard/video-session/${profile._id}`}>
                      <Video className="mr-2 h-4 w-4" /> book a virtual session
                    </Link>
                  </Button>
                  <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full">
                    <StarIcon className="mr-2 h-4 w-4" /> Save to Favourites
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 px-6 py-2 rounded-full"
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
                      <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                        Report
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
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

      {/* Reviews Section */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-black dark:text-white">
              Reviews
            </h3>
            <Dialog
              open={isReviewDialogOpen}
              onOpenChange={setIsReviewDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-4 py-2 rounded-full">
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Write Your Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {renderStars(selectedRating, true, setSelectedRating)}
                  </div>
                  <Textarea
                    placeholder="Share your feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  {submitError && <p className="text-red-500">{submitError}</p>}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={selectedRating === 0 || !feedback}
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {reviews.length === 0 ? (
            <p className="text-center text-gray-500">No reviews yet.</p>
          ) : (
            <>
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-b py-4 last:border-b-0">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{review.reviewerName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex">{renderStars(review.rating)}</div>
                  </div>
                  <p className="mt-2">{review.feedback}</p>
                </div>
              ))}
              {reviews.length > 3 && (
                <div className="text-center mt-4">
                  <Dialog open={isViewAllOpen} onOpenChange={setIsViewAllOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link">View All Reviews</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>All Reviews</DialogTitle>
                      </DialogHeader>
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b py-4 last:border-b-0"
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold">
                                {review.reviewerName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(
                                  review.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="mt-2">{review.feedback}</p>
                        </div>
                      ))}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SpecialistProfilePage;
