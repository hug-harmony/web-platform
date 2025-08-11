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

const ProfilePage: React.FC<Props> = ({ params }) => {
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
            image: data.image || "/register.jpg",
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
            image: data.image || "/register.jpg",
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
          <Skeleton className="h-64 sm:h-80 w-full" />
          <div className="p-6 sm:p-8 text-center space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-20 w-full max-w-2xl mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-40 mx-auto" />
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

  const validImageSrc = profile.image || "/register.jpg";
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
        className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden"
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
          <div className="absolute inset-0 bg-opacity-30" />
          <div className="relative flex justify-center items-center h-full">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-md z-10">
              <Image
                src={validImageSrc}
                alt={profile.name}
                width={160}
                height={160}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-gray-800"
              variants={itemVariants}
            >
              {profile.name}
            </motion.h2>
          </div>
          <motion.div
            className="flex items-center justify-center gap-2 mt-2 text-gray-600"
            variants={itemVariants}
          >
            {profile.location && (
              <>
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </>
            )}
            {profile.rating !== undefined && (
              <>
                <Star className="h-4 w-4 ml-4 text-yellow-400" />
                <span>
                  {profile.rating} ({profile.reviewCount || 0} reviews)
                </span>
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
                  className="bg-[#C6A89D] text-white text-xs px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {tagsArray.length > 4 && (
                <span className="bg-[#C6A89D] text-white text-xs px-3 py-1 rounded-full">
                  +{tagsArray.length - 4} more
                </span>
              )}
            </motion.div>
          )}

          {profile.type === "specialist" && profile.biography && (
            <motion.div
              className="mt-6 max-w-2xl mx-auto text-gray-700"
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
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm text-left">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-gray-600" />
                      <h4 className="font-semibold text-sm sm:text-base">
                        Education
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {profile.education}
                    </p>
                  </div>
                )}
                {profile.license && (
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h4 className="font-semibold text-sm sm:text-base">
                        License Number
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {profile.license}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          {profile.rate !== undefined && (
            <motion.div className="mt-6 space-y-4" variants={itemVariants}>
              <p className="text-lg font-semibold text-gray-800">
                ${profile.rate}/session
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href={`/dashboard/appointments/book/${profile._id}`}>
                  <Button className="bg-[#E8C5BC] hover:bg-[#D9B1A4] text-black px-6 py-2 rounded-full">
                    <Book /> Book a Session
                  </Button>
                </Link>

                <Button className="bg-[#E8C5BC] hover:bg-[#D9B1A4] text-black px-6 py-2 rounded-full">
                  <StarIcon /> Save to Favourites
                </Button>
                <Button className="bg-[#E8C5BC] hover:bg-[#D9B1A4] text-black px-6 py-2 rounded-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto">
                        <MoreVertical className="h-5 w-5 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Block</DropdownMenuItem>
                      <DropdownMenuItem>Report</DropdownMenuItem>
                      <DropdownMenuItem>Make a Note</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
