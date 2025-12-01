import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Professional } from "@/types/professional";
import { Filters } from "@/hooks/professionals/useFilters";

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
  const R = 6371; // Earth's radius in km
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

/**
 * Converts time string (e.g., "09:00 AM") to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const trimmed = time.trim();
  const [timePart, period] = trimmed.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours24 = h;
  if (period === "PM" && h !== 12) hours24 += 12;
  if (period === "AM" && h === 12) hours24 = 0;
  return hours24 * 60 + (m ?? 0);
}

/**
 * Filter and sort professionals based on applied filters and search query
 */
export function filterAndSort(
  data: Professional[],
  filters: Filters & { availabilities?: Record<string, string[]> },
  searchQuery: string
): Professional[] {
  return (
    data
      // Filter out invalid entries
      .filter((p) => p._id)

      // Search filter
      .filter((p) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.biography?.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query)
        );
      })

      // Location/Radius filter
      .filter((p) => {
        const isCustomLocation =
          filters.location === "Current Location" ||
          filters.location === "Custom Location";

        if (
          isCustomLocation &&
          filters.currentLat &&
          filters.currentLng &&
          filters.radius !== undefined
        ) {
          if (!p.lat || !p.lng) return false;
          let dist = calculateDistance(
            filters.currentLat,
            filters.currentLng,
            p.lat,
            p.lng
          );
          if (filters.unit === "miles") dist /= 1.60934;
          return dist <= filters.radius;
        }

        if (filters.location && !isCustomLocation) {
          return p.location === filters.location;
        }

        return true;
      })

      // Rating filter
      .filter((p) => !filters.minRating || (p.rating || 0) >= filters.minRating)

      // Availability filter (date + time range)
      .filter((p) => {
        if (!filters.selectedDate) return true;

        const availabilities = filters.availabilities;
        if (!availabilities) return true;

        const slots = availabilities[p._id];
        if (!slots || slots.length === 0) return false;

        const [startMins, endMins] = filters.timeRange;

        // Check if any slot falls within the time range
        return slots.some((slot) => {
          const slotMins = timeToMinutes(slot);
          return slotMins >= startMins && slotMins <= endMins;
        });
      })

      // Age filters
      .filter(
        (p) => filters.minAge === undefined || (p.age ?? 0) >= filters.minAge
      )
      .filter(
        (p) => filters.maxAge === undefined || (p.age ?? 100) <= filters.maxAge
      )

      // Gender filter
      .filter((p) => !filters.gender || p.gender === filters.gender)

      // Profile picture filter
      .filter((p) => {
        if (filters.hasProfilePic === "yes") return !!p.image;
        if (filters.hasProfilePic === "no") return !p.image;
        return true;
      })

      // Online status filter
      .filter((p) => {
        if (!filters.onlineStatus) return true;
        if (!p.lastOnline) return false;

        const lastOnlineTime = new Date(p.lastOnline).getTime();
        const threshold = thresholds[filters.onlineStatus];

        return threshold ? Date.now() - lastOnlineTime <= threshold : true;
      })

      // Venue filter
      .filter((p) => {
        if (!filters.venue) return true;
        if (filters.venue === "both") return true;
        return p.venue === filters.venue || p.venue === "both";
      })

      // Type filter
      .filter((p) => !filters.type || p.type === filters.type)

      // Advanced filters
      .filter((p) => !filters.race || p.race === filters.race)
      .filter((p) => !filters.ethnicity || p.ethnicity === filters.ethnicity)
      .filter((p) => !filters.bodyType || p.bodyType === filters.bodyType)
      .filter(
        (p) =>
          !filters.personalityType ||
          p.personalityType === filters.personalityType
      )

      // Sorting
      .sort((a, b) => {
        switch (filters.sortBy) {
          case "rating":
            return (b.rating || 0) - (a.rating || 0);
          case "rate":
            return (a.rate || 0) - (b.rate || 0);
          case "rate-desc":
            return (b.rate || 0) - (a.rate || 0);
          case "name":
            return (a.name || "").localeCompare(b.name || "");
          case "newest":
            return (
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
            );
          default:
            return 0;
        }
      })
  );
}
