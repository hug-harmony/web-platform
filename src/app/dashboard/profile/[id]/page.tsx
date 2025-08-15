/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gem, Upload } from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  profileImage?: string | null;
  location?: string | null;
  email: string;
  type: "user" | "specialist";
  role?: string | null;
  tags?: string | null;
  biography?: string | null;
  education?: string | null;
  license?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

const ProfilePage: React.FC<Props> = ({ params }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSpecialist, setIsEditingSpecialist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingSpecialist, setUpdatingSpecialist] = useState(false);
  const [specialistStatusLoading, setSpecialistStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSpecialistStatus = async (
    retries = 3,
    delay = 1000
  ): Promise<void> => {
    setSpecialistStatusLoading(true);
    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        const specialistRes = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!specialistRes.ok) {
          throw new Error(
            `Failed to fetch specialist application: ${specialistRes.status}`
          );
        }
        const { status: appStatus, specialistId } = await specialistRes.json();
        console.log(`Attempt ${attempt} - Specialist Status Response:`, {
          appStatus,
          specialistId,
        });
        setIsSpecialist(appStatus === "approved");
        setSpecialistId(specialistId || null);

        if (appStatus === "approved" && specialistId) {
          const specialistDetailsRes = await fetch(
            `/api/specialists/${specialistId}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          );
          if (specialistDetailsRes.ok) {
            const specialistData = await specialistDetailsRes.json();
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    type: "specialist",
                    role: specialistData.role,
                    tags: specialistData.tags,
                    biography: specialistData.biography,
                    education: specialistData.education,
                    license: specialistData.license,
                    location: specialistData.location,
                    rating: specialistData.rating,
                    reviewCount: specialistData.reviewCount,
                    rate: specialistData.rate,
                  }
                : prev
            );
            break; // Exit retry loop on success
          } else {
            console.error(
              "Failed to fetch specialist details:",
              await specialistDetailsRes.text()
            );
          }
        }
        if (attempt < retries && appStatus !== "approved") {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (err: any) {
      console.error("Fetch Specialist Status Error:", err.message);
      setIsSpecialist(false);
      setSpecialistId(null);
      toast.error("Failed to fetch specialist status. Please try again.");
    } finally {
      setSpecialistStatusLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfileAndSpecialistStatus = async () => {
      try {
        const { id } = await params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid ID format:", id);
          notFound();
        }

        // Fetch profile
        const res = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            id: data.id,
            name:
              data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : null,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            profileImage: data.profileImage,
            location: data.location,
            email: data.email,
            type: "user",
          });
        } else {
          console.error("User API response:", res.status, await res.text());
          if (res.status === 401) router.push("/login");
          if (res.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${res.status}`);
        }

        // Fetch specialist status
        await fetchSpecialistStatus();
      } catch (err: any) {
        console.error("Fetch Profile Error:", err.message, err.stack);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndSpecialistStatus();

    // Refresh specialist status if coming from professional application page
    const fromApplication = searchParams.get("fromApplication");
    if (fromApplication) {
      fetchSpecialistStatus();
    }
  }, [params, router, searchParams]);

  const handleNewProfessional = async () => {
    if (status === "loading") {
      toast.error("Please wait while we check your session");
      return;
    }
    router.push("professional-application");
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName")?.toString(),
      lastName: formData.get("lastName")?.toString(),
      name: `${formData.get("firstName")?.toString() || ""} ${formData.get("lastName")?.toString() || ""}`.trim(),
      phoneNumber: formData.get("phoneNumber")?.toString(),
      location: formData.get("location")?.toString(),
    };

    try {
      let profileImageUrl = profile?.profileImage;
      if (selectedFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", selectedFile);
        const uploadRes = await fetch("/api/users/upload", {
          method: "POST",
          body: imageFormData,
        });
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "Failed to upload image");
        }
        profileImageUrl = (await uploadRes.json()).url;
      }

      const res = await fetch(`/api/users/${profile?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, profileImage: profileImageUrl }),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile({
          ...updatedProfile,
          name:
            updatedProfile.firstName && updatedProfile.lastName
              ? `${updatedProfile.firstName} ${updatedProfile.lastName}`
              : null,
        });

        await update({
          ...session,
          user: {
            ...session?.user,
            name: updatedProfile.name,
            email: updatedProfile.email,
            image: updatedProfile.profileImage,
          },
        });

        setIsEditing(false);
        setSelectedFile(null);
        toast.success("Profile updated successfully");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateSpecialist = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setUpdatingSpecialist(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      role: formData.get("role")?.toString(),
      tags: formData.get("tags")?.toString(),
      biography: formData.get("biography")?.toString(),
      education: formData.get("education")?.toString(),
      license: formData.get("license")?.toString(),
      location: formData.get("location")?.toString(),
      rate: parseFloat(formData.get("rate")?.toString() || "0") || null,
      name:
        profile?.name ||
        `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim(), // Add name from profile
    };

    try {
      if (!specialistId || specialistStatusLoading) {
        console.log("Refetching specialist status before update...");
        await fetchSpecialistStatus();
        if (!specialistId) {
          throw new Error(
            "No approved specialist profile found. Please ensure your specialist application is approved and try again."
          );
        }
      }

      console.log("Attempting to update specialist with ID:", specialistId);
      const res = await fetch(`/api/specialists/${specialistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (res.ok) {
        const updatedSpecialist = await res.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                role: updatedSpecialist.role,
                tags: updatedSpecialist.tags,
                biography: updatedSpecialist.biography,
                education: updatedSpecialist.education,
                license: updatedSpecialist.license,
                location: updatedSpecialist.location,
                rate: updatedSpecialist.rate,
                name: updatedSpecialist.name, // Update name in profile
              }
            : prev
        );
        setIsEditingSpecialist(false);
        toast.success("Specialist profile updated successfully");
      } else {
        const errorData = await res.json();
        throw new Error(
          errorData.error || "Failed to update specialist profile"
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update specialist profile";
      toast.error(errorMessage);
    } finally {
      setUpdatingSpecialist(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
                <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardContent className="space-y-4 pt-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-[#C4C4C4]/50" />
                  <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
                </div>
              ))}
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
                <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
              </div>
            </CardContent>
          </Card>
          {isSpecialist && (
            <Card className="shadow-lg">
              <CardContent className="space-y-4 pt-6">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton
                      className={`h-${
                        i === 2 || i === 4 ? 20 : 10
                      } w-full bg-[#C4C4C4]/50`}
                    />
                  </div>
                ))}
                <div className="flex space-x-4">
                  <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
                  <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
                </div>
              </CardContent>
            </Card>
          )}
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

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src={profile.profileImage || "/register.jpg"}
                alt={profile.name || "User"}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {profile.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl text-black dark:text-white">
                {profile.name || "User"}
              </CardTitle>
              <p className="text-black text-sm">{profile.email}</p>
              {isSpecialist && (
                <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                  Professional
                </span>
              )}
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          {!isSpecialist && (
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="outline"
                onClick={handleNewProfessional}
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
              >
                <Gem className="w-4 h-4 mr-2 text-[#F3CFC6]" /> Become a
                Professional
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <motion.div variants={itemVariants} className="space-y-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2 max-w-2xl">
                  <Label
                    htmlFor="profileImage"
                    className="text-black dark:text-white"
                  >
                    Profile Picture
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      disabled={!isEditing || updating}
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isEditing || updating}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                    >
                      <Upload className="w-4 h-4 mr-2 text-[#F3CFC6]" />{" "}
                      {selectedFile ? "Replace" : "Upload Image"}
                    </Button>
                    {selectedFile && (
                      <span className="text-sm text-[#C4C4C4] truncate max-w-xs">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-black dark:text-white"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={profile.firstName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.target.value })
                    }
                    disabled={!isEditing || updating}
                    className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-black dark:text-white"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={profile.lastName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                    disabled={!isEditing || updating}
                    className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="phoneNumber"
                    className="text-black dark:text-white"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={profile.phoneNumber || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phoneNumber: e.target.value })
                    }
                    disabled={!isEditing || updating}
                    className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="location"
                    className="text-black dark:text-white"
                  >
                    Location
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={profile.location || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    disabled={!isEditing || updating}
                    className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  />
                </div>
                <div className="flex space-x-4 mt-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isEditing || updating}
                    className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                  >
                    Edit
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isEditing || updating}
                    className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                  >
                    {updating ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </CardContent>
        </Card>
        {isSpecialist && (
          <Card className="shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <motion.div variants={itemVariants} className="space-y-4">
                <form onSubmit={handleUpdateSpecialist} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="role"
                      className="text-black dark:text-white"
                    >
                      Role
                    </Label>
                    <Input
                      id="role"
                      name="role"
                      value={profile.role || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, role: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="tags"
                      className="text-black dark:text-white"
                    >
                      Specialty Tags
                    </Label>
                    <Input
                      id="tags"
                      name="tags"
                      value={profile.tags || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, tags: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="biography"
                      className="text-black dark:text-white"
                    >
                      Biography
                    </Label>
                    <Textarea
                      id="biography"
                      name="biography"
                      value={profile.biography || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, biography: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="education"
                      className="text-black dark:text-white"
                    >
                      Education
                    </Label>
                    <Textarea
                      id="education"
                      name="education"
                      value={profile.education || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, education: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="license"
                      className="text-black dark:text-white"
                    >
                      License
                    </Label>
                    <Input
                      id="license"
                      name="license"
                      value={profile.license || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, license: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-black dark:text-white"
                    >
                      Location
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      value={profile.location || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, location: e.target.value })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="rate"
                      className="text-black dark:text-white"
                    >
                      Rate (per session)
                    </Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      value={profile.rate || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          rate: parseFloat(e.target.value) || null,
                        })
                      }
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    />
                  </div>
                  <div className="flex space-x-4 mt-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setIsEditingSpecialist(true)}
                      disabled={
                        isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                    >
                      Edit Specialist
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !isEditingSpecialist ||
                        updatingSpecialist ||
                        specialistStatusLoading
                      }
                      className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                    >
                      {updatingSpecialist ? "Saving..." : "Save Specialist"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

export default ProfilePage;
