/* eslint-disable @typescript-eslint/no-explicit-any */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// lib/utils.ts
import { Therapist } from "@/types/therapist";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildDisplayName(user?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Unknown User"
  );
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const thresholds: Record<string, number> = {
  "24hrs": 24 * 3600000,
  "1day": 24 * 3600000,
  "1week": 7 * 24 * 3600000,
  "1month": 30 * 24 * 3600000,
  "1year": 365 * 24 * 3600000,
};

export function filterAndSort(
  data: Therapist[],
  filters: any,
  searchQuery: string
) {
  return data
    .filter((t) => t._id)
    .filter(
      (t) =>
        !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((t) => {
      if (
        filters.location === "Current Location" &&
        filters.currentLat &&
        filters.currentLng &&
        filters.radius !== undefined
      ) {
        if (!t.lat || !t.lng) return false;
        let dist = calculateDistance(
          filters.currentLat,
          filters.currentLng,
          t.lat,
          t.lng
        );
        if (filters.unit === "miles") dist /= 1.60934;
        return dist <= filters.radius;
      }
      if (filters.location && filters.location !== "Current Location")
        return t.location === filters.location;
      return true;
    })
    .filter((t) => !filters.minRating || (t.rating || 0) >= filters.minRating)
    .filter((t) =>
      filters.selectedDate && filters.selectedTime
        ? (filters.availabilities?.[t._id] || []).includes(filters.selectedTime)
        : true
    )
    .filter(
      (t) => filters.minAge === undefined || (t.age ?? 0) >= filters.minAge
    )
    .filter(
      (t) => filters.maxAge === undefined || (t.age ?? 0) <= filters.maxAge
    )
    .filter((t) => !filters.gender || t.gender === filters.gender)
    .filter((t) => filters.hasProfilePic !== "yes" || !!t.image)
    .filter((t) => filters.hasProfilePic !== "no" || !t.image)
    .filter(
      (t) =>
        !filters.onlineStatus ||
        (t.lastOnline &&
          Date.now() - new Date(t.lastOnline).getTime() <=
            thresholds[filters.onlineStatus])
    )
    .filter((t) => !filters.venue || t.venue === filters.venue)
    .filter((t) => !filters.type || t.type === filters.type)
    .filter((t) => !filters.race || t.race === filters.race)
    .filter((t) => !filters.ethnicity || t.ethnicity === filters.ethnicity)
    .filter((t) => !filters.bodyType || t.bodyType === filters.bodyType)
    .filter(
      (t) =>
        !filters.personalityType ||
        t.personalityType === filters.personalityType
    )
    .sort((a, b) => {
      if (filters.sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (filters.sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
}
