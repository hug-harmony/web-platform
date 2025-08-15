/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-async-client-component */
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
  User,
  Video,
} from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Animation variants
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

const SpecialistProfilePage: React.FC<Props> = ({ params }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { id } = await params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid ID format:", id);
          notFound();
        }

        // Try fetching from specialists API
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
            image: data.image || "",
            location: data.location || "",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            rate: data.rate || 0,
            type: "specialist",
          });
          setLoading(false);
          return;
        }

        // Try fetching from users API
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
            image: data.image || "",
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

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
            </div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-40 w-40 rounded-full mx-auto bg-[#C4C4C4]/50" />
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
      {/* Content Section */}
      <Card className="shadow-lg">
        <CardContent className="pt-6 text-center">
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-white shadow-md mx-auto">
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
                  <User className="h-16 w-16 text-black" />
                </div>
              )}
            </div>

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

            {profile.type === "specialist" && tagsArray.length > 0 && (
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

            {profile.type === "specialist" && profile.biography && (
              <div className="max-w-2xl mx-auto text-black dark:text-white">
                <h3 className="text-lg font-semibold mb-2">Biography</h3>
                <p className="text-sm sm:text-base">{profile.biography}</p>
              </div>
            )}

            {profile.type === "specialist" &&
              (profile.education || profile.license) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.education && (
                    <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 p-4 rounded-lg shadow-sm text-left">
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
                    <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 p-4 rounded-lg shadow-sm text-left">
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
                      <Book className="mr-2 h-4 w-4" /> Book a Session
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full"
                  >
                    <Link href={`/dashboard/video-session/${profile._id}`}>
                      <Video className="mr-2 h-4 w-4" /> Video Call
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
    </motion.div>
  );
};

export default SpecialistProfilePage;
