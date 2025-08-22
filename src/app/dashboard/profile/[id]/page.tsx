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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

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
  biography?: string | null;
  email: string;
  type: "user" | "specialist";
  role?: string | null;
  tags?: string | null;
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [openAvailability, setOpenAvailability] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation functions
  const validateUserProfileForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const firstName = formData.get("firstName")?.toString() || "";
    const lastName = formData.get("lastName")?.toString() || "";
    const phoneNumber = formData.get("phoneNumber")?.toString() || "";
    const location = formData.get("location")?.toString() || "";
    const biography = formData.get("biography")?.toString() || "";

    if (!firstName) {
      errors.firstName = "First name is required";
    } else if (firstName.length > 50) {
      errors.firstName = "First name must be 50 characters or less";
    }

    if (!lastName) {
      errors.lastName = "Last name is required";
    } else if (lastName.length > 50) {
      errors.lastName = "Last name must be 50 characters or less";
    }

    if (!phoneNumber) {
      errors.phoneNumber = "Phone Number is required";
    }

    if (location && location.length > 100) {
      errors.location = "Location must be 100 characters or less";
    }

    if (biography && biography.length > 500) {
      errors.biography = "Biography must be 500 characters or less";
    }

    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png"];
      if (!validTypes.includes(selectedFile.type)) {
        errors.profileImage = "Only JPEG or PNG images are allowed";
      } else if (selectedFile.size > 5 * 1024 * 1024) {
        errors.profileImage = "Image must be less than 5MB";
      }
    }

    return errors;
  };

  const validateSpecialistProfileForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const role = formData.get("role")?.toString() || "";
    const tags = formData.get("tags")?.toString() || "";
    const biography = formData.get("biography")?.toString() || "";
    const education = formData.get("education")?.toString() || "";
    const license = formData.get("license")?.toString() || "";
    const location = formData.get("location")?.toString() || "";
    const rate = formData.get("rate")?.toString() || "";

    if (!role) {
      errors.role = "Role is required";
    } else if (role.length > 50) {
      errors.role = "Role must be 50 characters or less";
    }

    if (tags && tags.length > 100) {
      errors.tags = "Tags must be 100 characters or less";
    }

    if (biography && biography.length > 500) {
      errors.biography = "Biography must be 500 characters or less";
    }

    if (education && education.length > 500) {
      errors.education = "Education must be 500 characters or less";
    }

    if (license && license.length > 100) {
      errors.license = "License must be 100 characters or less";
    }

    if (location && location.length > 100) {
      errors.location = "Location must be 100 characters or less";
    }

    if (rate) {
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum <= 0) {
        errors.rate = "Rate must be a positive number";
      } else if (rateNum > 10000) {
        errors.rate = "Rate cannot exceed 10000";
      }
    }

    return errors;
  };

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
            break;
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

        const res = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            id: data.id,
            name: data.name,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            profileImage: data.profileImage,
            location: data.location,
            biography: data.biography,
            email: data.email,
            type: "user",
          });
        } else {
          console.error("User API response:", res.status, await res.text());
          if (res.status === 401) router.push("/login");
          if (res.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${res.status}`);
        }

        await fetchSpecialistStatus();
      } catch (err: any) {
        console.error("Fetch Profile Error:", err.message, err.stack);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndSpecialistStatus();

    const fromApplication = searchParams.get("fromApplication");
    if (fromApplication) {
      fetchSpecialistStatus();
    }
  }, [params, router, searchParams]);

  useEffect(() => {
    if (date && openAvailability) {
      fetch(`/api/specialists/availability?date=${date.toISOString().split("T")[0]}`)
        .then((res) => res.json())
        .then((data) => setSelectedSlots(data.slots || []))
        .catch(() => toast.error("Failed to fetch availability"));
    }
  }, [date, openAvailability]);

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
    const errors = validateUserProfileForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors in the form");
      setUpdating(false);
      return;
    }

    setFormErrors({});

    const data = {
      firstName: formData.get("firstName")?.toString(),
      lastName: formData.get("lastName")?.toString(),
      name:
        `${formData.get("firstName")?.toString() || ""} ${formData.get("lastName")?.toString() || ""}`.trim() ||
        undefined,
      phoneNumber: formData.get("phoneNumber")?.toString(),
      location: formData.get("location")?.toString(),
      biography: formData.get("biography")?.toString(),
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
          name: updatedProfile.name,
          type: profile?.type || "user",
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
    const errors = validateSpecialistProfileForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors in the specialist form");
      setUpdatingSpecialist(false);
      return;
    }

    setFormErrors({});

    const data = {
      role: formData.get("role")?.toString(),
      tags: formData.get("tags")?.toString(),
      biography: formData.get("biography")?.toString(),
      education: formData.get("education")?.toString(),
      license: formData.get("license")?.toString(),
      location: formData.get("location")?.toString(),
      rate: parseFloat(formData.get("rate")?.toString() || "0") || null,
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

  const handleSubmitAvailability = async () => {
    if (!date) return;
    try {
      const res = await fetch("/api/specialists/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date.toISOString().split("T")[0], slots: selectedSlots }),
      });
      if (res.ok) {
        toast.success("Availability updated");
        setOpenAvailability(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update availability");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update availability");
    }
  };

  const toggleSlot = (time: string) => {
    setSelectedSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const allSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);
  const isOwnProfile = session?.user?.id === profile?.id;

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

        <div className="flex gap-6">
          <Card className="grow">
            <CardContent className="space-y-4 pt-6">
              {[...Array(6)].map((_, i) => (
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
            <Card className="grow">
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
                disabled={status === "loading"}
              >
                <Gem className="w-4 h-4 mr-2 text-[#F3CFC6]" /> Become a
                Professional
              </Button>
            </motion.div>
          )}
          {isOwnProfile && isSpecialist && (
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Dialog open={openAvailability} onOpenChange={setOpenAvailability}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
                    disabled={status === "loading"}
                  >
                    Set Availability
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Daily Availability</DialogTitle>
                  </DialogHeader>
                  <Calendar mode="single" selected={date} onSelect={setDate} />
                  <div className="grid grid-cols-3 gap-2">
                    {allSlots.map((time) => (
                      <div key={time} className="flex items-center space-x-2">
                        <Checkbox
                          id={time}
                          checked={selectedSlots.includes(time)}
                          onCheckedChange={() => toggleSlot(time)}
                        />
                        <Label htmlFor={time}>{time}</Label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSubmitAvailability}>Save</Button>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-6">
        <Card className="grow">
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-xl">Personal Details</h2>
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
                      accept="image/jpeg,image/png"
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
                  {formErrors.profileImage && (
                    <p className="text-red-500 text-sm">
                      {formErrors.profileImage}
                    </p>
                  )}
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
                    aria-label="First Name"
                    required
                    maxLength={50}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-sm">
                      {formErrors.firstName}
                    </p>
                  )}
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
                    aria-label="Last Name"
                    required
                    maxLength={50}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-500 text-sm">
                      {formErrors.lastName}
                    </p>
                  )}
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
                    aria-label="Phone Number"
                    pattern="\+?[\d\s-()]{7,15}"
                    title="Phone number should be 7-15 digits, may include +, -, (), or spaces"
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-red-500 text-sm">
                      {formErrors.phoneNumber}
                    </p>
                  )}
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
                    aria-label="Location"
                    maxLength={100}
                  />
                  {formErrors.location && (
                    <p className="text-red-500 text-sm">
                      {formErrors.location}
                    </p>
                  )}
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
                    disabled={!isEditing || updating}
                    className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                    aria-label="Biography"
                    maxLength={500}
                  />
                  {formErrors.biography && (
                    <p className="text-red-500 text-sm">
                      {formErrors.biography}
                    </p>
                  )}
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
          <Card className="grow">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl">Professional Profile Details</h2>
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
                      aria-label="Role"
                      required
                      maxLength={50}
                    />
                    {formErrors.role && (
                      <p className="text-red-500 text-sm">{formErrors.role}</p>
                    )}
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
                      aria-label="Specialty Tags"
                      maxLength={100}
                    />
                    {formErrors.tags && (
                      <p className="text-red-500 text-sm">{formErrors.tags}</p>
                    )}
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
                      aria-label="Biography"
                      maxLength={500}
                    />
                    {formErrors.biography && (
                      <p className="text-red-500 text-sm">
                        {formErrors.biography}
                      </p>
                    )}
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
                      aria-label="Education"
                      maxLength={500}
                    />
                    {formErrors.education && (
                      <p className="text-red-500 text-sm">
                        {formErrors.education}
                      </p>
                    )}
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
                      aria-label="License"
                      maxLength={100}
                    />
                    {formErrors.license && (
                      <p className="text-red-500 text-sm">
                        {formErrors.license}
                      </p>
                    )}
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
                      aria-label="Location"
                      maxLength={100}
                    />
                    {formErrors.location && (
                      <p className="text-red-500 text-sm">
                        {formErrors.location}
                      </p>
                    )}
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
                      aria-label="Rate"
                      min={0}
                      max={10000}
                      step={0.01}
                    />
                    {formErrors.rate && (
                      <p className="text-red-500 text-sm">{formErrors.rate}</p>
                    )}
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