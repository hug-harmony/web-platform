/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gem, Upload } from "lucide-react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "lodash.debounce";

type OnboardingStep =
  | "FORM"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface OnboardingStatus {
  step: OnboardingStep;
  application?: {
    status: OnboardingStep;
    submittedAt?: string;
    videoWatchedAt?: string;
    quizPassedAt?: string;
    professionalId?: string;
  };
  video?: {
    watchedSec: number;
    durationSec: number;
    isCompleted: boolean;
  };
}

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
  type: "user" | "professional";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  venue?: "host" | "visit" | "both" | null;
  relationshipStatus?: string | null;
  orientation?: string | null;
  height?: string | null;
  ethnicity?: string | null;
  zodiacSign?: string | null;
  favoriteColor?: string | null;
  favoriteMedia?: string | null;
  petOwnership?: string | null;
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ProfilePage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingProfessional, setUpdatingProfessional] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const router = useRouter();
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────────────────────
  //  Location autocomplete (Nominatim) - Updated to use Nominatim v1 + modern headers
  // ──────────────────────────────────────────────────────────────
  const fetchLocationSuggestions = debounce(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setIsLocationDropdownOpen(false);
      return;
    }
    setIsLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            "User-Agent": "YourAppName/1.0 (your.email@example.com)",
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const data: LocationSuggestion[] = await res.json();
        setLocationSuggestions(data);
        setIsLocationDropdownOpen(true);
      }
    } catch (err) {
      console.error("Nominatim error:", err);
      toast.error("Failed to fetch location suggestions");
    } finally {
      setIsLocationLoading(false);
    }
  }, 300);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const validateLocation = async (loc: string) => {
    if (!loc) return true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          loc
        )}`,
        {
          headers: {
            "User-Agent": "YourAppName/1.0 (your.email@example.com)",
          },
        }
      );
      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  };

  // ──────────────────────────────────────────────────────────────
  //  Load profile + onboarding status
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { id } = await params;
      if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();

      try {
        // 1. User profile
        const userRes = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!userRes.ok) {
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error("User not found");
        }
        const user = await userRes.json();

        setProfile({
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          location: user.location,
          biography: user.biography,
          email: user.email,
          type: "user",
          relationshipStatus: user.relationshipStatus,
          orientation: user.orientation,
          height: user.height,
          ethnicity: user.ethnicity,
          zodiacSign: user.zodiacSign,
          favoriteColor: user.favoriteColor,
          favoriteMedia: user.favoriteMedia,
          petOwnership: user.petOwnership,
          venue: null,
        });

        // 2. Onboarding status (only for own profile)
        if (session?.user?.id === id) {
          const statusRes = await fetch(
            "/api/professionals/onboarding/status",
            { credentials: "include" }
          );
          if (statusRes.ok) {
            const data = await statusRes.json();
            setOnboarding(data);

            // If approved, load professional details
            if (data.step === "APPROVED" && data.application?.professionalId) {
              const specRes = await fetch(
                `/api/professionals/${data.application.professionalId}`,
                { credentials: "include" }
              );
              if (specRes.ok) {
                const spec = await specRes.json();
                setIsProfessional(true);
                setProfessionalId(spec.id);
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        type: "professional",
                        biography: spec.biography,
                        rate: spec.rate,
                        venue: spec.venue,
                      }
                    : p
                );
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [params, session?.user?.id, router]);

  // ──────────────────────────────────────────────────────────────
  //  Header button logic
  // ──────────────────────────────────────────────────────────────
  const renderHeaderButton = () => {
    const own = session?.user?.id === profile?.id;
    if (!own) return null;

    // APPROVED → show professional management
    if (onboarding?.step === "APPROVED" && professionalId) {
      return (
        <div className="flex gap-2">
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
              onClick={() =>
                router.push(
                  `/dashboard/discounts?professionalId=${professionalId}`
                )
              }
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              Manage Discounts
            </Button>
          </motion.div>
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
              onClick={() =>
                router.push(
                  `/dashboard/availability?professionalId=${professionalId}`
                )
              }
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              Manage Availability
            </Button>
          </motion.div>
        </div>
      );
    }

    // Any other step → status button
    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="outline"
          onClick={() =>
            router.push("/dashboard/profile/professional-application/status")
          }
          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full flex items-center gap-2"
        >
          <Gem className="w-4 h-4 text-[#F3CFC6]" />
          My Application Status
        </Button>
      </motion.div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  //  Form validation
  // ──────────────────────────────────────────────────────────────
  const validateUserProfileForm = async (form: FormData) => {
    const errors: Record<string, string> = {};

    const firstName = form.get("firstName")?.toString().trim() ?? "";
    const lastName = form.get("lastName")?.toString().trim() ?? "";
    const phoneNumber = form.get("phoneNumber")?.toString().trim() ?? "";
    const location = form.get("location")?.toString().trim() ?? "";
    const biography = form.get("biography")?.toString() ?? "";
    const relationshipStatus = form.get("relationshipStatus")?.toString() ?? "";
    const orientation = form.get("orientation")?.toString() ?? "";
    const height = form.get("height")?.toString() ?? "";
    const ethnicity = form.get("ethnicity")?.toString() ?? "";
    const zodiacSign = form.get("zodiacSign")?.toString() ?? "";
    const favoriteColor = form.get("favoriteColor")?.toString() ?? "";
    const favoriteMedia = form.get("favoriteMedia")?.toString() ?? "";
    const petOwnership = form.get("petOwnership")?.toString() ?? "";

    if (!firstName) errors.firstName = "First name is required";
    else if (firstName.length > 50) errors.firstName = "Max 50 characters";
    if (!lastName) errors.lastName = "Last name is required";
    else if (lastName.length > 50) errors.lastName = "Max 50 characters";
    if (!phoneNumber) errors.phoneNumber = "Phone number is required";
    else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(phoneNumber))
      errors.phoneNumber = "Invalid phone format";
    if (location && location.length > 100)
      errors.location = "Max 100 characters";
    else if (location && !(await validateLocation(location)))
      errors.location = "Select a valid location";
    if (biography && biography.length > 500)
      errors.biography = "Max 500 characters";
    if (relationshipStatus && relationshipStatus.length > 50)
      errors.relationshipStatus = "Max 50 characters";
    if (orientation && orientation.length > 50)
      errors.orientation = "Max 50 characters";
    if (height && height.length > 20) errors.height = "Max 20 characters";
    if (ethnicity && ethnicity.length > 50)
      errors.ethnicity = "Max 50 characters";
    if (zodiacSign && zodiacSign.length > 20)
      errors.zodiacSign = "Max 20 characters";
    if (favoriteColor && favoriteColor.length > 30)
      errors.favoriteColor = "Max 30 characters";
    if (favoriteMedia && favoriteMedia.length > 100)
      errors.favoriteMedia = "Max 100 characters";
    if (petOwnership && petOwnership.length > 50)
      errors.petOwnership = "Max 50 characters";

    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(selectedFile.type))
        errors.profileImage = "Only JPEG, PNG, WebP allowed";
      else if (selectedFile.size > 5 * 1024 * 1024)
        errors.profileImage = "Max 5 MB";
    }

    return errors;
  };

  const validateProfessionalProfileForm = async (form: FormData) => {
    const errors: Record<string, string> = {};
    const biography = form.get("biography")?.toString().trim() ?? "";
    const rateStr = form.get("rate")?.toString() ?? "";
    const venue = form.get("venue")?.toString() ?? "";

    if (!biography) errors.biography = "Required";
    else if (biography.length > 500) errors.biography = "Max 500 characters";
    if (!rateStr) errors.rate = "Required";
    else {
      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate <= 0) errors.rate = "Must be positive";
      else if (rate > 10000) errors.rate = "Max 10,000";
    }
    if (!venue) errors.venue = "Required";
    else if (!["host", "visit", "both"].includes(venue))
      errors.venue = "Invalid selection";

    return errors;
  };

  // ──────────────────────────────────────────────────────────────
  //  Submit handlers
  // ──────────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    const form = new FormData(e.currentTarget);
    const errors = await validateUserProfileForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error("Please fix the errors");
      setUpdating(false);
      return;
    }
    setFormErrors({});

    try {
      let imageUrl = profile?.profileImage ?? null;
      if (selectedFile) {
        const img = new FormData();
        img.append("file", selectedFile);
        const up = await fetch("/api/users/upload", {
          method: "POST",
          body: img,
          credentials: "include",
        });
        if (!up.ok) {
          const err = await up.text();
          throw new Error(err || "Image upload failed");
        }
        const { url } = await up.json();
        imageUrl = url;
      }

      const payload = {
        firstName: form.get("firstName")?.toString().trim(),
        lastName: form.get("lastName")?.toString().trim(),
        name: `${form.get("firstName")} ${form.get("lastName")}`.trim(),
        phoneNumber: form.get("phoneNumber")?.toString().trim(),
        location: form.get("location")?.toString().trim(),
        biography: form.get("biography")?.toString(),
        relationshipStatus: form.get("relationshipStatus")?.toString(),
        orientation: form.get("orientation")?.toString(),
        height: form.get("height")?.toString(),
        ethnicity: form.get("ethnicity")?.toString(),
        zodiacSign: form.get("zodiacSign")?.toString(),
        favoriteColor: form.get("favoriteColor")?.toString(),
        favoriteMedia: form.get("favoriteMedia")?.toString(),
        petOwnership: form.get("petOwnership")?.toString(),
        profileImage: imageUrl,
      };

      const res = await fetch(`/api/users/${profile?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Update failed");
      }

      const updated = await res.json();
      setProfile((p) => (p ? { ...p, ...updated, type: p.type } : p));
      await update({
        user: {
          ...session?.user,
          name: updated.name,
          image: updated.profileImage,
        },
      });
      toast.success("Profile updated");
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfessional = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setUpdatingProfessional(true);
    const form = new FormData(e.currentTarget);
    const errors = await validateProfessionalProfileForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error("Fix professional form errors");
      setUpdatingProfessional(false);
      return;
    }

    try {
      const payload = {
        biography: form.get("biography")?.toString().trim(),
        rate: parseFloat(form.get("rate")?.toString() ?? "0") || null,
        venue: form.get("venue")?.toString() as
          | "host"
          | "visit"
          | "both"
          | null,
      };

      const res = await fetch(`/api/professionals/${professionalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Update failed");
      }

      const updated = await res.json();
      setProfile((p) =>
        p
          ? {
              ...p,
              biography: updated.biography,
              rate: updated.rate,
              venue: updated.venue,
            }
          : p
      );
      toast.success("Professional profile updated");
      setIsEditingProfessional(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdatingProfessional(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  //  UI
  // ──────────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (!profile)
    return (
      <div className="p-6 text-center text-red-500">Profile not found</div>
    );

  const ownProfile = session?.user?.id === profile.id;

  return (
    <>
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div
              variants={itemVariants}
              className="flex items-center space-x-4"
            >
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarImage
                  src={profile.profileImage || "/register.jpg"}
                  alt={profile.name ?? ""}
                />
                <AvatarFallback className="bg-[#C4C4C4] text-black">
                  {profile.name?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl text-black dark:text-white">
                  {profile.name ?? "User"}
                </CardTitle>
                <p className="text-black text-sm">{profile.email}</p>
                {isProfessional && (
                  <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                    Professional
                  </span>
                )}
              </div>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            {renderHeaderButton()}
          </CardContent>
        </Card>

        {/* Main Columns */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* USER PROFILE */}
          <Card className="flex-1">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl text-black dark:text-white">
                Personal Details
              </h2>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Profile Image */}
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
                        accept="image/jpeg,image/png,image/webp"
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

                  {/* First Name */}
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
                      required
                      maxLength={50}
                    />
                    {formErrors.firstName && (
                      <p className="text-red-500 text-sm">
                        {formErrors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
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
                      required
                      maxLength={50}
                    />
                    {formErrors.lastName && (
                      <p className="text-red-500 text-sm">
                        {formErrors.lastName}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
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
                      pattern="\+?[\d\s\-()]{7,15}"
                      title="7-15 digits, may include +, -, (), spaces"
                    />
                    {formErrors.phoneNumber && (
                      <p className="text-red-500 text-sm">
                        {formErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <Label
                      htmlFor="location"
                      className="text-black dark:text-white"
                    >
                      Location
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      ref={locationInputRef}
                      value={profile.location || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile({ ...profile, location: val });
                        if (isEditing) fetchLocationSuggestions(val);
                      }}
                      onFocus={() =>
                        isEditing && setIsLocationDropdownOpen(true)
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      maxLength={100}
                      placeholder="Type city or address"
                    />
                    {isLocationDropdownOpen && isEditing && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-[#F3CFC6] rounded-md shadow-lg max-h-60 overflow-auto">
                        {isLocationLoading ? (
                          <p className="p-2 text-gray-500">Loading...</p>
                        ) : locationSuggestions.length === 0 ? (
                          <p className="p-2 text-gray-500">No results</p>
                        ) : (
                          locationSuggestions.map((s) => (
                            <button
                              key={s.display_name}
                              type="button"
                              className="w-full text-left px-4 py-2 text-black dark:text-white hover:bg-[#F3CFC6]/20"
                              onClick={() => {
                                setProfile({
                                  ...profile,
                                  location: s.display_name,
                                });
                                setLocationSuggestions([]);
                                setIsLocationDropdownOpen(false);
                              }}
                            >
                              {s.display_name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {formErrors.location && (
                      <p className="text-red-500 text-sm">
                        {formErrors.location}
                      </p>
                    )}
                  </div>

                  {/* Biography */}
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
                      maxLength={500}
                    />
                    {formErrors.biography && (
                      <p className="text-red-500 text-sm">
                        {formErrors.biography}
                      </p>
                    )}
                  </div>

                  {/* Relationship Status */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="relationshipStatus"
                      className="text-black dark:text-white"
                    >
                      Relationship Status
                    </Label>
                    <Select
                      name="relationshipStatus"
                      value={profile.relationshipStatus || ""}
                      onValueChange={(v) =>
                        setProfile({ ...profile, relationshipStatus: v })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="In a relationship">
                          In a relationship
                        </SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Prefer not to say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.relationshipStatus && (
                      <p className="text-red-500 text-sm">
                        {formErrors.relationshipStatus}
                      </p>
                    )}
                  </div>

                  {/* Orientation */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="orientation"
                      className="text-black dark:text-white"
                    >
                      Orientation
                    </Label>
                    <Select
                      name="orientation"
                      value={profile.orientation || ""}
                      onValueChange={(v) =>
                        setProfile({ ...profile, orientation: v })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Heterosexual">
                          Heterosexual
                        </SelectItem>
                        <SelectItem value="Homosexual">Homosexual</SelectItem>
                        <SelectItem value="Bisexual">Bisexual</SelectItem>
                        <SelectItem value="Asexual">Asexual</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.orientation && (
                      <p className="text-red-500 text-sm">
                        {formErrors.orientation}
                      </p>
                    )}
                  </div>

                  {/* Height */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="height"
                      className="text-black dark:text-white"
                    >
                      Height
                    </Label>
                    <Input
                      id="height"
                      name="height"
                      value={profile.height || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, height: e.target.value })
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      placeholder="e.g., 5'10 or 178 cm"
                      maxLength={20}
                    />
                    {formErrors.height && (
                      <p className="text-red-500 text-sm">
                        {formErrors.height}
                      </p>
                    )}
                  </div>

                  {/* Ethnicity */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="ethnicity"
                      className="text-black dark:text-white"
                    >
                      Ethnicity
                    </Label>
                    <Input
                      id="ethnicity"
                      name="ethnicity"
                      value={profile.ethnicity || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, ethnicity: e.target.value })
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      maxLength={50}
                    />
                    {formErrors.ethnicity && (
                      <p className="text-red-500 text-sm">
                        {formErrors.ethnicity}
                      </p>
                    )}
                  </div>

                  {/* Zodiac Sign */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="zodiacSign"
                      className="text-black dark:text-white"
                    >
                      Zodiac Sign
                    </Label>
                    <Select
                      name="zodiacSign"
                      value={profile.zodiacSign || ""}
                      onValueChange={(v) =>
                        setProfile({ ...profile, zodiacSign: v })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aries">Aries</SelectItem>
                        <SelectItem value="Taurus">Taurus</SelectItem>
                        <SelectItem value="Gemini">Gemini</SelectItem>
                        <SelectItem value="Cancer">Cancer</SelectItem>
                        <SelectItem value="Leo">Leo</SelectItem>
                        <SelectItem value="Virgo">Virgo</SelectItem>
                        <SelectItem value="Libra">Libra</SelectItem>
                        <SelectItem value="Scorpio">Scorpio</SelectItem>
                        <SelectItem value="Sagittarius">Sagittarius</SelectItem>
                        <SelectItem value="Capricorn">Capricorn</SelectItem>
                        <SelectItem value="Aquarius">Aquarius</SelectItem>
                        <SelectItem value="Pisces">Pisces</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.zodiacSign && (
                      <p className="text-red-500 text-sm">
                        {formErrors.zodiacSign}
                      </p>
                    )}
                  </div>

                  {/* Favorite Color */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="favoriteColor"
                      className="text-black dark:text-white"
                    >
                      Favorite Color
                    </Label>
                    <Input
                      id="favoriteColor"
                      name="favoriteColor"
                      value={profile.favoriteColor || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          favoriteColor: e.target.value,
                        })
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      maxLength={30}
                    />
                    {formErrors.favoriteColor && (
                      <p className="text-red-500 text-sm">
                        {formErrors.favoriteColor}
                      </p>
                    )}
                  </div>

                  {/* Favorite Media */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="favoriteMedia"
                      className="text-black dark:text-white"
                    >
                      Favorite Movie/TV Show
                    </Label>
                    <Input
                      id="favoriteMedia"
                      name="favoriteMedia"
                      value={profile.favoriteMedia || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          favoriteMedia: e.target.value,
                        })
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      maxLength={100}
                    />
                    {formErrors.favoriteMedia && (
                      <p className="text-red-500 text-sm">
                        {formErrors.favoriteMedia}
                      </p>
                    )}
                  </div>

                  {/* Pet Ownership */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="petOwnership"
                      className="text-black dark:text-white"
                    >
                      Pet Ownership
                    </Label>
                    <Select
                      name="petOwnership"
                      value={profile.petOwnership || ""}
                      onValueChange={(v) =>
                        setProfile({ ...profile, petOwnership: v })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.petOwnership && (
                      <p className="text-red-500 text-sm">
                        {formErrors.petOwnership}
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-4 mt-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setLocationSuggestions([]);
                        setIsLocationDropdownOpen(false);
                      }}
                      disabled={!isEditing || updating}
                      className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                    >
                      Cancel
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
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#C4C4C4]">First Name</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.firstName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Last Name</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.lastName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Phone Number</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.phoneNumber || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Location</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.location || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Biography</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.biography || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">
                      Relationship Status
                    </p>
                    <p className="text-black dark:text-white break-words">
                      {profile.relationshipStatus || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Orientation</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.orientation || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Height</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.height || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Ethnicity</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.ethnicity || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Zodiac Sign</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.zodiacSign || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Favorite Color</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.favoriteColor || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">
                      Favorite Movie/TV Show
                    </p>
                    <p className="text-black dark:text-white break-words">
                      {profile.favoriteMedia || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Pet Ownership</p>
                    <p className="text-black dark:text-white break-words">
                      {profile.petOwnership || "Not provided"}
                    </p>
                  </div>

                  {ownProfile && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PROFESSIONAL PROFILE (only when approved) */}
          {isProfessional && (
            <Card className="flex-1">
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-xl text-black dark:text-white">
                  Professional Profile Details
                </h2>

                {isEditingProfessional ? (
                  <form
                    onSubmit={handleUpdateProfessional}
                    className="space-y-4"
                  >
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
                          !isEditingProfessional || updatingProfessional
                        }
                        className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                        maxLength={500}
                        required
                      />
                      {formErrors.biography && (
                        <p className="text-red-500 text-sm">
                          {formErrors.biography}
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
                          !isEditingProfessional || updatingProfessional
                        }
                        className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                        min={0}
                        max={10000}
                        step={0.01}
                        required
                      />
                      {formErrors.rate && (
                        <p className="text-red-500 text-sm">
                          {formErrors.rate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="venue"
                        className="text-black dark:text-white"
                      >
                        Venue Preference
                      </Label>
                      <Select
                        name="venue"
                        value={profile.venue || ""}
                        onValueChange={(v) =>
                          setProfile({ ...profile, venue: v as any })
                        }
                        disabled={
                          !isEditingProfessional || updatingProfessional
                        }
                      >
                        <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="visit">Visit</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.venue && (
                        <p className="text-red-500 text-sm">
                          {formErrors.venue}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-4 mt-4">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsEditingProfessional(false)}
                        disabled={
                          !isEditingProfessional || updatingProfessional
                        }
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          !isEditingProfessional || updatingProfessional
                        }
                        className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                      >
                        {updatingProfessional
                          ? "Saving..."
                          : "Save Professional Details"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Biography</p>
                      <p className="text-black dark:text-white break-words">
                        {profile.biography || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">
                        Rate (per session)
                      </p>
                      <p className="text-black dark:text-white break-words">
                        {profile.rate
                          ? `$${profile.rate.toFixed(2)}`
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Venue Preference</p>
                      <p className="text-black dark:text-white break-words">
                        {profile.venue
                          ? profile.venue.charAt(0).toUpperCase() +
                            profile.venue.slice(1)
                          : "Not provided"}
                      </p>
                    </div>

                    {ownProfile && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingProfessional(true)}
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                      >
                        Edit Professional Details
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default ProfilePage;

/* ------------------------------------------------------------------ */
/* Loading Skeleton – updated for better responsiveness               */
/* ------------------------------------------------------------------ */
function LoadingSkeleton() {
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

      <div className="flex gap-6 flex-col lg:flex-row">
        <Card className="flex-1">
          <CardContent className="space-y-4 pt-6">
            {[...Array(14)].map((_, i) => (
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
        <Card className="flex-1">
          <CardContent className="space-y-4 pt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton
                  className={`h-${i === 0 ? 20 : 10} w-full bg-[#C4C4C4]/50`}
                />
              </div>
            ))}
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-24 rounded-full bg-[#C4C4C4]/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
