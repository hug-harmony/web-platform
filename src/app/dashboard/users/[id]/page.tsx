/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  BookOpen,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Star,
  XCircle,
  Flag,
} from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  education?: string;
  license?: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  type: "specialist" | "user";
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ProfilePage: React.FC<Props> = ({ params }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { id } = await params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid ID format:", id);
          notFound();
        }

        let res = await fetch(`/api/specialists?id=${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            _id: data.id,
            name: data.name,
            role: data.role || "Licensed Therapist",
            tags: data.tags || "",
            biography: data.biography || "",
            education: data.education || "",
            license: data.license || "",
            image: data.image || "/assets/images/avatar-placeholder.png", // Updated fallback path
            location: data.location || "",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            rate: data.rate || 0,
            type: "specialist",
          });
          setLoading(false);
          return;
        }

        res = await fetch(`/api/users?id=${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            _id: data._id,
            name:
              data.name ||
              (data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : "Unknown User"),
            image: data.profileImage || "/assets/images/avatar-placeholder.png", // Changed from `data.image` to `data.profileImage`
            location: data.location || "",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            rate: data.rate || 0,
            type: "user",
          });
        } else {
          console.error("User API response:", res.status, await res.text());
          if (res.status === 401) router.push("/login");
          if (res.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${res.status}`);
        }
      } catch (err: any) {
        console.error("Fetch Profile Error:", err.message, err.stack);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params, router]);

  const handleStartChat = async () => {
    if (status === "loading") {
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

    if (!/^[0-9a-fA-F]{24}$/.test(profile._id)) {
      toast.error("Invalid recipient ID");
      console.error("Invalid recipient ID:", profile._id);
      return;
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: profile._id }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || `Failed to create conversation: ${res.status}`
        );
      }

      const conversation = await res.json();
      if (!conversation.id || !/^[0-9a-fA-F]{24}$/.test(conversation.id)) {
        throw new Error("Invalid conversation ID returned");
      }

      router.push(`/dashboard/messaging/${conversation.id}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start chat";
      console.error("Start chat error:", errorMessage);
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-7xl rounded-2xl shadow-lg overflow-hidden bg-gradient-to-b from-[#F3CFC6] to-[#C4C4C4]">
          <div className="relative h-64 sm:h-80">
            <Skeleton className="absolute inset-0 bg-[#C4C4C4]/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F3CFC6]/30 to-[#C4C4C4]/30" />
            <div className="relative flex justify-center items-center h-full">
              <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white" />
            </div>
          </div>
          <div className="p-6 sm:p-8 text-center space-y-4">
            <Skeleton className="h-8 w-1/2 mx-auto bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-1/4 mx-auto bg-[#C4C4C4]/50" />
            <div className="flex flex-wrap justify-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-6 w-20 rounded-full bg-[#C4C4C4]/50" />
            </div>
            <div className="max-w-2xl mx-auto">
              <Skeleton className="h-6 w-1/4 mx-auto bg-[#C4C4C4]/50 mb-2" />
              <Skeleton className="h-4 w-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-3/4 bg-[#C4C4C4]/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg" />
              <Skeleton className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg" />
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            </div>
          </div>
        </div>
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

  const validImageSrc =
    profile.image || "/assets/images/avatar-placeholder.png"; // Updated fallback path
  const tagsArray = profile.tags
    ? profile.tags.split(",").map((tag) => tag.trim())
    : [];

  return (
    <motion.div
      className="min-h-screen flex items-start justify-center p-4 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="w-full max-w-7xl rounded-2xl shadow-lg overflow-hidden"
        variants={itemVariants}
      >
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
            <Avatar className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-md z-10">
              <AvatarImage src={validImageSrc} alt={profile.name} />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {profile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="p-6 sm:p-8 text-center">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-black dark:text-white"
            variants={itemVariants}
          >
            {profile.name}
            {profile.role && `, ${profile.role}`}
          </motion.h2>
          <motion.div
            className="flex items-center justify-center gap-2 mt-2 text-[#C4C4C4]"
            variants={itemVariants}
          >
            {profile.location && (
              <>
                <MapPin className="h-5 w-5 text-[#F3CFC6]" />
                <span>{profile.location}</span>
              </>
            )}
          </motion.div>

          {profile.type === "specialist" && tagsArray.length > 0 && (
            <motion.div
              className="flex flex-wrap justify-center gap-2 mt-4"
              variants={itemVariants}
            >
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
            </motion.div>
          )}

          {profile.type === "specialist" && profile.biography && (
            <motion.div
              className="mt-6 max-w-2xl mx-auto text-black dark:text-white"
              variants={itemVariants}
            >
              <h3 className="text-lg font-semibold mb-2">Biography</h3>
              <p className="text-sm sm:text-base">{profile.biography}</p>
            </motion.div>
          )}

          {profile.type === "specialist" &&
            (profile.education || profile.license) && (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"
                variants={itemVariants}
              >
                {profile.education && (
                  <div className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 p-4 rounded-lg shadow-sm text-left">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#F3CFC6]" />
                      <h4 className="font-semibold text-sm sm:text-base text-black dark:text-white">
                        Education
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-[#C4C4C4] mt-1">
                      {profile.education}
                    </p>
                  </div>
                )}
                {profile.license && (
                  <div className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 p-4 rounded-lg shadow-sm text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#F3CFC6]" />
                      <h4 className="font-semibold text-sm sm:text-base text-black dark:text-white">
                        License Number
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-[#C4C4C4] mt-1">
                      {profile.license}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          <motion.div
            className="mt-6 flex items-center justify-center gap-4"
            variants={itemVariants}
          >
            <Button
              onClick={handleStartChat}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full"
            >
              <MessageSquare className="mr-2 h-5 w-5 text-black dark:text-white" />
              Start Chat with {profile.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 px-6 py-2 rounded-full"
                >
                  <MoreHorizontal className="mr-2 h-5 w-5 text-[#F3CFC6]" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                  <Star className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Add to Favourites
                </DropdownMenuItem>
                <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                  <XCircle className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Block
                </DropdownMenuItem>
                <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                  <Flag className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Report
                </DropdownMenuItem>
                <DropdownMenuItem className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20">
                  <FileText className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Make a Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
