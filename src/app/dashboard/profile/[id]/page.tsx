/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from "lodash.debounce";

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
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
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
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced function to fetch location suggestions from Nominatim
  const fetchLocationSuggestions = debounce(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setIsLocationDropdownOpen(false);
      return;
    }
    setIsLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "YourAppName/1.0 (your.email@example.com)",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setLocationSuggestions(data);
        setIsLocationDropdownOpen(true);
      } else {
        throw new Error(`Nominatim API error: ${res.status}`);
      }
    } catch (err) {
      console.error("Location search error:", err);
      toast.error("Failed to fetch location suggestions. Please try again.");
      setLocationSuggestions([]);
      setIsLocationDropdownOpen(false);
    } finally {
      setIsLocationLoading(false);
    }
  }, 300);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Validate location by geocoding on form submit
  const validateLocation = async (location: string): Promise<boolean> => {
    if (!location) return true; // Location is optional
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
        {
          headers: {
            "User-Agent": "YourAppName/1.0 (your.email@example.com)",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Validation functions
  const validateUserProfileForm = async (formData: FormData) => {
    const errors: Record<string, string> = {};
    const firstName = formData.get("firstName")?.toString() || "";
    const lastName = formData.get("lastName")?.toString() || "";
    const phoneNumber = formData.get("phoneNumber")?.toString() || "";
    const location = formData.get("location")?.toString() || "";
    const biography = formData.get("biography")?.toString() || "";
    const relationshipStatus =
      formData.get("relationshipStatus")?.toString() || "";
    const orientation = formData.get("orientation")?.toString() || "";
    const height = formData.get("height")?.toString() || "";
    const ethnicity = formData.get("ethnicity")?.toString() || "";
    const zodiacSign = formData.get("zodiacSign")?.toString() || "";
    const favoriteColor = formData.get("favoriteColor")?.toString() || "";
    const favoriteMedia = formData.get("favoriteMedia")?.toString() || "";
    const petOwnership = formData.get("petOwnership")?.toString() || "";

    if (!firstName) errors.firstName = "First name is required";
    else if (firstName.length > 50)
      errors.firstName = "First name must be 50 characters or less";
    if (!lastName) errors.lastName = "Last name is required";
    else if (lastName.length > 50)
      errors.lastName = "Last name must be 50 characters or less";
    if (!phoneNumber) errors.phoneNumber = "Phone Number is required";
    else if (!/\+?[\d\s-()]{7,15}/.test(phoneNumber))
      errors.phoneNumber =
        "Phone number must be 7-15 digits, may include +, -, (), or spaces";
    if (location && location.length > 100)
      errors.location = "Location must be 100 characters or less";
    else if (location && !(await validateLocation(location)))
      errors.location = "Please select a valid location from the suggestions";
    if (biography && biography.length > 500)
      errors.biography = "Biography must be 500 characters or less";
    if (relationshipStatus && relationshipStatus.length > 50)
      errors.relationshipStatus =
        "Relationship status must be 50 characters or less";
    if (orientation && orientation.length > 50)
      errors.orientation = "Orientation must be 50 characters or less";
    if (height && height.length > 20)
      errors.height = "Height must be 20 characters or less";
    if (ethnicity && ethnicity.length > 50)
      errors.ethnicity = "Ethnicity must be 50 characters or less";
    if (zodiacSign && zodiacSign.length > 20)
      errors.zodiacSign = "Zodiac sign must be 20 characters or less";
    if (favoriteColor && favoriteColor.length > 30)
      errors.favoriteColor = "Favorite color must be 30 characters or less";
    if (favoriteMedia && favoriteMedia.length > 100)
      errors.favoriteMedia =
        "Favorite movie/TV show must be 100 characters or less";
    if (petOwnership && petOwnership.length > 50)
      errors.petOwnership = "Pet ownership must be 50 characters or less";
    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png"];
      if (!validTypes.includes(selectedFile.type))
        errors.profileImage = "Only JPEG or PNG images are allowed";
      else if (selectedFile.size > 5 * 1024 * 1024)
        errors.profileImage = "Image must be less than 5MB";
    }
    return errors;
  };

  const validateSpecialistProfileForm = async (formData: FormData) => {
    const errors: Record<string, string> = {};
    const role = formData.get("role")?.toString() || "";
    const tags = formData.get("tags")?.toString() || "";
    const biography = formData.get("biography")?.toString() || "";
    const location = formData.get("location")?.toString() || "";
    const rate = formData.get("rate")?.toString() || "";

    if (!role) errors.role = "Role is required";
    else if (role.length > 50)
      errors.role = "Role must be 50 characters or less";
    if (tags && tags.length > 100)
      errors.tags = "Tags must be 100 characters or less";
    if (biography && biography.length > 500)
      errors.biography = "Biography must be 500 characters or less";
    if (location && location.length > 100)
      errors.location = "Location must be 100 characters or less";
    else if (location && !(await validateLocation(location)))
      errors.location = "Please select a valid location from the suggestions";
    if (rate) {
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum <= 0)
        errors.rate = "Rate must be a positive number";
      else if (rateNum > 10000) errors.rate = "Rate cannot exceed 10000";
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
        if (!specialistRes.ok)
          throw new Error(
            `Failed to fetch specialist application: ${specialistRes.status}`
          );
        const { status: appStatus, specialistId } = await specialistRes.json();
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
            relationshipStatus: data.relationshipStatus,
            orientation: data.orientation,
            height: data.height,
            ethnicity: data.ethnicity,
            zodiacSign: data.zodiacSign,
            favoriteColor: data.favoriteColor,
            favoriteMedia: data.favoriteMedia,
            petOwnership: data.petOwnership,
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
    if (fromApplication) fetchSpecialistStatus();
  }, [params, router, searchParams]);

  useEffect(() => {
    if (date && openAvailability) {
      fetch(
        `/api/specialists/availability?date=${date.toISOString().split("T")[0]}`
      )
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
    const errors = await validateUserProfileForm(formData);
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
      relationshipStatus: formData.get("relationshipStatus")?.toString(),
      orientation: formData.get("orientation")?.toString(),
      height: formData.get("height")?.toString(),
      ethnicity: formData.get("ethnicity")?.toString(),
      zodiacSign: formData.get("zodiacSign")?.toString(),
      favoriteColor: formData.get("favoriteColor")?.toString(),
      favoriteMedia: formData.get("favoriteMedia")?.toString(),
      petOwnership: formData.get("petOwnership")?.toString(),
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
        setLocationSuggestions([]);
        setIsLocationDropdownOpen(false);
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
    const errors = await validateSpecialistProfileForm(formData);
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
      location: formData.get("location")?.toString(),
      rate: parseFloat(formData.get("rate")?.toString() || "0") || null,
    };
    try {
      if (!specialistId || specialistStatusLoading) {
        await fetchSpecialistStatus();
        if (!specialistId) {
          throw new Error(
            "No approved specialist profile found. Please ensure your specialist application is approved and try again."
          );
        }
      }
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
                location: updatedSpecialist.location,
                rate: updatedSpecialist.rate,
              }
            : prev
        );
        setIsEditingSpecialist(false);
        setLocationSuggestions([]);
        setIsLocationDropdownOpen(false);
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
        body: JSON.stringify({
          date: date.toISOString().split("T")[0],
          slots: selectedSlots,
        }),
      });
      if (res.ok) {
        toast.success("Availability updated");
        setOpenAvailability(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update availability");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update availability"
      );
    }
  };

  const toggleSlot = (time: string) => {
    setSelectedSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const allSlots = [
    "12:00 AM",
    "12:30 AM",
    "1:00 AM",
    "1:30 AM",
    "2:00 AM",
    "2:30 AM",
    "3:00 AM",
    "3:30 AM",
    "4:00 AM",
    "4:30 AM",
    "5:00 AM",
    "5:30 AM",
    "6:00 AM",
    "6:30 AM",
    "7:00 AM",
    "7:30 AM",
    "8:00 AM",
    "8:30 AM",
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
    "5:00 PM",
    "5:30 PM",
    "6:00 PM",
    "6:30 PM",
    "7:00 PM",
    "7:30 PM",
    "8:00 PM",
    "8:30 PM",
    "9:00 PM",
    "9:30 PM",
    "10:00 PM",
    "10:30 PM",
    "11:00 PM",
    "11:30 PM",
  ];

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
              {[...Array(10)].map((_, i) => (
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
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton
                      className={`h-${i === 2 ? 20 : 10} w-full bg-[#C4C4C4]/50`}
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
              <Dialog
                open={openAvailability}
                onOpenChange={setOpenAvailability}
              >
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
            <h2 className="text-xl text-black dark:text-white">
              Personal Details
            </h2>
            <motion.div variants={itemVariants} className="space-y-4">
              {isEditing ? (
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
                        const value = e.target.value;
                        setProfile({ ...profile, location: value });
                        if (isEditing) {
                          setIsLocationDropdownOpen(true);
                          fetchLocationSuggestions(value);
                        }
                      }}
                      onFocus={() =>
                        isEditing && setIsLocationDropdownOpen(true)
                      }
                      disabled={!isEditing || updating}
                      className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                      aria-label="Location"
                      maxLength={100}
                      placeholder="Type a city or address"
                    />
                    {isLocationDropdownOpen && isEditing && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-[#F3CFC6] rounded-md shadow-lg max-h-60 overflow-auto">
                        {isLocationLoading ? (
                          <p className="p-2 text-gray-500">Loading...</p>
                        ) : locationSuggestions.length === 0 ? (
                          <p className="p-2 text-gray-500">No results found</p>
                        ) : (
                          locationSuggestions.map((sug) => (
                            <button
                              key={sug.display_name}
                              type="button"
                              className="w-full text-left px-4 py-2 text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                              onClick={() => {
                                setProfile({
                                  ...profile,
                                  location: sug.display_name,
                                });
                                setLocationSuggestions([]);
                                setIsLocationDropdownOpen(false);
                              }}
                            >
                              {sug.display_name}
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
                      onValueChange={(value) =>
                        setProfile({ ...profile, relationshipStatus: value })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select relationship status" />
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
                      onValueChange={(value) =>
                        setProfile({ ...profile, orientation: value })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select orientation" />
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
                      aria-label="Height"
                      placeholder="e.g., 5'10\"
                      maxLength={20}
                    />
                    {formErrors.height && (
                      <p className="text-red-500 text-sm">
                        {formErrors.height}
                      </p>
                    )}
                  </div>
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
                      aria-label="Ethnicity"
                      maxLength={50}
                    />
                    {formErrors.ethnicity && (
                      <p className="text-red-500 text-sm">
                        {formErrors.ethnicity}
                      </p>
                    )}
                  </div>
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
                      onValueChange={(value) =>
                        setProfile({ ...profile, zodiacSign: value })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select zodiac sign" />
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
                      aria-label="Favorite Color"
                      maxLength={30}
                    />
                    {formErrors.favoriteColor && (
                      <p className="text-red-500 text-sm">
                        {formErrors.favoriteColor}
                      </p>
                    )}
                  </div>
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
                      aria-label="Favorite Movie/TV Show"
                      maxLength={100}
                    />
                    {formErrors.favoriteMedia && (
                      <p className="text-red-500 text-sm">
                        {formErrors.favoriteMedia}
                      </p>
                    )}
                  </div>
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
                      onValueChange={(value) =>
                        setProfile({ ...profile, petOwnership: value })
                      }
                      disabled={!isEditing || updating}
                    >
                      <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                        <SelectValue placeholder="Select pet ownership" />
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
                    <p className="text-black dark:text-white">
                      {profile.firstName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Last Name</p>
                    <p className="text-black dark:text-white">
                      {profile.lastName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Phone Number</p>
                    <p className="text-black dark:text-white">
                      {profile.phoneNumber || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Location</p>
                    <p className="text-black dark:text-white">
                      {profile.location || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Biography</p>
                    <p className="text-black dark:text-white">
                      {profile.biography || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">
                      Relationship Status
                    </p>
                    <p className="text-black dark:text-white">
                      {profile.relationshipStatus || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Orientation</p>
                    <p className="text-black dark:text-white">
                      {profile.orientation || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Height</p>
                    <p className="text-black dark:text-white">
                      {profile.height || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Ethnicity</p>
                    <p className="text-black dark:text-white">
                      {profile.ethnicity || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Zodiac Sign</p>
                    <p className="text-black dark:text-white">
                      {profile.zodiacSign || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Favorite Color</p>
                    <p className="text-black dark:text-white">
                      {profile.favoriteColor || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">
                      Favorite Movie/TV Show
                    </p>
                    <p className="text-black dark:text-white">
                      {profile.favoriteMedia || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#C4C4C4]">Pet Ownership</p>
                    <p className="text-black dark:text-white">
                      {profile.petOwnership || "Not provided"}
                    </p>
                  </div>
                  {isOwnProfile && (
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
            </motion.div>
          </CardContent>
        </Card>
        {isSpecialist && (
          <Card className="grow">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl text-black dark:text-white">
                Professional Profile Details
              </h2>
              <motion.div variants={itemVariants} className="space-y-4">
                {isEditingSpecialist ? (
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
                        <p className="text-red-500 text-sm">
                          {formErrors.role}
                        </p>
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
                        <p className="text-red-500 text-sm">
                          {formErrors.tags}
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
                          const value = e.target.value;
                          setProfile({ ...profile, location: value });
                          if (isEditingSpecialist) {
                            setIsLocationDropdownOpen(true);
                            fetchLocationSuggestions(value);
                          }
                        }}
                        onFocus={() =>
                          isEditingSpecialist && setIsLocationDropdownOpen(true)
                        }
                        disabled={
                          !isEditingSpecialist ||
                          updatingSpecialist ||
                          specialistStatusLoading
                        }
                        className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                        aria-label="Location"
                        maxLength={100}
                        placeholder="Type a city or address"
                      />
                      {isLocationDropdownOpen && isEditingSpecialist && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-[#F3CFC6] rounded-md shadow-lg max-h-60 overflow-auto">
                          {isLocationLoading ? (
                            <p className="p-2 text-gray-500">Loading...</p>
                          ) : locationSuggestions.length === 0 ? (
                            <p className="p-2 text-gray-500">
                              No results found
                            </p>
                          ) : (
                            locationSuggestions.map((sug) => (
                              <button
                                key={sug.display_name}
                                type="button"
                                className="w-full text-left px-4 py-2 text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                                onClick={() => {
                                  setProfile({
                                    ...profile,
                                    location: sug.display_name,
                                  });
                                  setLocationSuggestions([]);
                                  setIsLocationDropdownOpen(false);
                                }}
                              >
                                {sug.display_name}
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
                        <p className="text-red-500 text-sm">
                          {formErrors.rate}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-4 mt-4">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setIsEditingSpecialist(false);
                          setLocationSuggestions([]);
                          setIsLocationDropdownOpen(false);
                        }}
                        disabled={
                          !isEditingSpecialist ||
                          updatingSpecialist ||
                          specialistStatusLoading
                        }
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                      >
                        Cancel
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
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Role</p>
                      <p className="text-black dark:text-white">
                        {profile.role || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Specialty Tags</p>
                      <p className="text-black dark:text-white">
                        {profile.tags || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Biography</p>
                      <p className="text-black dark:text-white">
                        {profile.biography || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Location</p>
                      <p className="text-black dark:text-white">
                        {profile.location || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">
                        Rate (per session)
                      </p>
                      <p className="text-black dark:text-white">
                        {profile.rate ? `$${profile.rate}` : "Not provided"}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingSpecialist(true)}
                        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                      >
                        Edit Specialist
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

export default ProfilePage;
