/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MapPin, BookOpen, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
    return <div className="text-center p-6">Loading...</div>;
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
      className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-start justify-center p-4 sm:p-6"
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
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-gray-800"
            variants={itemVariants}
          >
            {profile.name}
            {profile.role && `, ${profile.role}`}
          </motion.h2>
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

          <motion.div className="mt-6" variants={itemVariants}>
            <Button
              onClick={handleStartChat}
              className="mt-4 bg-[#E8C5BC] hover:bg-[#D9B1A4] text-black px-6 py-2 rounded-full"
            >
              Start Chat with {profile.name}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
