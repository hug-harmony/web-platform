/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, MoreVertical, StarIcon, MessageSquare } from "lucide-react";
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
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  type: "user";
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

        const res = await fetch(`/api/users?id=${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            _id: data.id,
            name:
              data.name ||
              (data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : "Unknown User"),
            image: data.profileImage || "",
            location: data.location || "",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
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
            <div className="flex justify-center gap-4">
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
            </div>
            <div className="flex items-center justify-center gap-2 text-[#C4C4C4]">
              {profile.location && (
                <>
                  <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                  <span>{profile.location}</span>
                </>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStartChat}
                className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Start Chat
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
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfilePage;
