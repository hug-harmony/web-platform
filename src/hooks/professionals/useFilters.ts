// hooks/professionals/useFilters.ts
import { useState } from "react";

export interface Filters {
  location: string;
  minRating: number;
  sortBy: string;
  currentLat: number | undefined;
  currentLng: number | undefined;
  radius: number | undefined;
  unit: "km" | "miles";
  minAge: number | undefined;
  maxAge: number | undefined;
  gender: "" | "male" | "female";
  hasProfilePic: "" | "yes" | "no";
  onlineStatus: "" | "24hrs" | "1day" | "1week" | "1month" | "1year";
  venue: string;
  type: "" | "user" | "professional";
  race: string;
  ethnicity: string;
  bodyType: string;
  personalityType: string;
  // NEW: Date/Time filters
  selectedDate: Date | undefined;
  timeRange: [number, number];
}

const initialFilters: Filters = {
  location: "",
  minRating: 0,
  sortBy: "",
  currentLat: undefined,
  currentLng: undefined,
  radius: undefined,
  unit: "miles",
  minAge: undefined,
  maxAge: undefined,
  gender: "",
  hasProfilePic: "",
  onlineStatus: "",
  venue: "",
  type: "",
  race: "",
  ethnicity: "",
  bodyType: "",
  personalityType: "",
  // NEW: Default to no date filter, full day range
  selectedDate: undefined,
  timeRange: [0, 1410], // 12:00 AM to 11:30 PM
};

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const reset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  return { filters, setFilters, appliedFilters, setAppliedFilters, reset };
}
