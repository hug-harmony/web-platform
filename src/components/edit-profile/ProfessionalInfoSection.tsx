// src/components/edit-profile/ProfessionalInfoSection.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { validateProfessionalProfileForm } from "@/lib/validate-edit-profile";
import { Profile } from "@/types/edit-profile";

interface Props {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  professionalId: string;
}

export function ProfessionalInfoSection({
  profile,
  setProfile,
  professionalId,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    const form = new FormData(e.currentTarget);
    const errors = validateProfessionalProfileForm(form);

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error("Please fix the errors");
      setUpdating(false);
      return;
    }

    try {
      const payload = {
        biography: form.get("biography")?.toString().trim() ?? null,
        rate: parseFloat(form.get("rate")?.toString() ?? "0") || null,
        venue: form.get("venue") as "host" | "visit" | "both" | null,
      };

      const res = await fetch(`/api/professionals/${professionalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Update failed");
      }

      const updated = await res.json();

      // Fixed: proper typing + no 'any'
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              biography: updated.biography ?? prev.biography,
              rate: updated.rate ?? prev.rate,
              venue: updated.venue ?? prev.venue,
            }
          : prev
      );

      toast.success("Professional profile updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdating(false);
    }
  };

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground">
        Loading professional details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl text-black dark:text-white">
        Professional Profile Details
      </h2>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Biography</Label>
            <Textarea
              name="biography"
              value={profile.biography || ""}
              onChange={(e) =>
                setProfile({ ...profile, biography: e.target.value })
              }
              disabled={updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] min-h-32"
              maxLength={500}
              required
            />
            {formErrors.biography && (
              <p className="text-red-500 text-sm">{formErrors.biography}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rate (per session)</Label>
            <Input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              value={profile.rate || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  rate: parseFloat(e.target.value) || null,
                })
              }
              disabled={updating}
              className="border-[#F3CFC6]"
              required
            />
            {formErrors.rate && (
              <p className="text-red-500 text-sm">{formErrors.rate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Venue Preference</Label>
            <Select
              name="venue"
              value={profile.venue || ""}
              onValueChange={(value) =>
                setProfile({
                  ...profile,
                  venue: value as "host" | "visit" | "both",
                })
              }
              disabled={updating}
            >
              <SelectTrigger className="border-[#F3CFC6]">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="visit">Visit</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.venue && (
              <p className="text-red-500 text-sm">{formErrors.venue}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updating}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] rounded-full"
            >
              {updating ? "Saving..." : "Save Professional Details"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-[#C4C4C4]">Biography</p>
            <p className="text-black dark:text-white break-words">
              {profile.biography || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Rate (per session)</p>
            <p className="text-black dark:text-white">
              {profile.rate ? `$${profile.rate.toFixed(2)}` : "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Venue Preference</p>
            <p className="text-black dark:text-white">
              {profile.venue
                ? profile.venue.charAt(0).toUpperCase() + profile.venue.slice(1)
                : "Not provided"}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="rounded-full text-[#F3CFC6] border-[#F3CFC6]"
          >
            Edit Professional Details
          </Button>
        </div>
      )}
    </div>
  );
}
