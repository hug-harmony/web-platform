/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ProfileHeader } from "@/components/edit-profile/ProfileHeader";
import { PersonalInfoSection } from "@/components/edit-profile/PersonalInfoSection";
import { ProfessionalInfoSection } from "@/components/edit-profile/ProfessionalInfoSection";
import { useProfile } from "@/hooks/edit-profile/useProfile";
import { useLocationSearch } from "@/hooks/edit-profile/useLocationSearch";
import { validateUserProfileForm } from "@/lib/validate-edit-profile";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

export default function ProfilePage({ params }: { params: { id: string } }) {
  const {
    profile,
    setProfile,
    onboarding,
    isProfessional,
    professionalId,
    loading,
  } = useProfile(params.id);
  const { data: session, update } = useSession();
  const locationSearch = useLocationSearch();

  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const ownProfile = session?.user?.id === profile?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setFormErrors({});

    const form = new FormData(e.currentTarget as HTMLFormElement);
    const errors = await validateUserProfileForm(form, selectedFile);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the errors");
      setUpdating(false);
      return;
    }

    try {
      // 1. Upload image if changed
      let imageUrl = profile?.profileImage ?? null;
      if (selectedFile) {
        const imgForm = new FormData();
        imgForm.append("file", selectedFile);
        const uploadRes = await fetch("/api/users/upload", {
          method: "POST",
          body: imgForm,
          credentials: "include",
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { url } = await uploadRes.json();
        imageUrl = url;
      }

      // 2. Update profile
      const payload = {
        firstName: form.get("firstName")?.toString().trim(),
        lastName: form.get("lastName")?.toString().trim(),
        name: `${form.get("firstName")} ${form.get("lastName")}`.trim(),
        phoneNumber: form.get("phoneNumber")?.toString().trim(),
        location: form.get("location")?.toString().trim() || null,
        biography: form.get("biography")?.toString() || null,
        relationshipStatus: form.get("relationshipStatus")?.toString() || null,
        orientation: form.get("orientation")?.toString() || null,
        height: form.get("height")?.toString() || null,
        ethnicity: form.get("ethnicity")?.toString() || null,
        zodiacSign: form.get("zodiacSign")?.toString() || null,
        favoriteColor: form.get("favoriteColor")?.toString() || null,
        favoriteMedia: form.get("favoriteMedia")?.toString() || null,
        petOwnership: form.get("petOwnership")?.toString() || null,
        ...(imageUrl && { profileImage: imageUrl }),
      };

      const res = await fetch(`/api/users/${profile?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Update failed");
      }

      const updatedUser = await res.json();

      // Update local state + session
      setProfile((prev) => (prev ? { ...prev, ...updatedUser } : prev));
      await update({
        // this comes from useSession()
        user: {
          ...session?.user,
          name: updatedUser.name,
          image: updatedUser.profileImage,
        },
      });

      toast.success("Profile updated successfully");
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!profile)
    return (
      <div className="p-8 text-center text-red-500">Profile not found</div>
    );

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <ProfileHeader
        profile={profile}
        isProfessional={isProfessional}
        ownProfile={ownProfile}
        onboardingStep={onboarding?.step}
        professionalId={professionalId}
      />

      <div className="flex gap-6 flex-col lg:flex-row">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <PersonalInfoSection
              profile={profile}
              setProfile={setProfile}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              updating={updating}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              formErrors={formErrors}
              locationProps={locationSearch}
              handleSubmit={handleSubmit}
            />
          </CardContent>
        </Card>

        {isProfessional && (
          <Card className="flex-1">
            <CardContent className="pt-6">
              <ProfessionalInfoSection
                profile={profile}
                setProfile={setProfile}
                professionalId={professionalId!}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
