// hooks/professionals/useFilters.ts
import { useState, useCallback, useMemo } from "react";

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
  selectedDate: undefined,
  timeRange: [0, 1410],
};

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const reset = useCallback(() => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, []);

  const removeFilter = useCallback((key: keyof Filters) => {
    setFilters((prev) => {
      const updated = { ...prev };

      switch (key) {
        case "minAge":
        case "maxAge":
          updated.minAge = undefined;
          updated.maxAge = undefined;
          break;
        case "radius":
          updated.radius = undefined;
          updated.currentLat = undefined;
          updated.currentLng = undefined;
          updated.location = "";
          break;
        case "timeRange":
          updated.timeRange = [0, 1410];
          break;
        case "selectedDate":
          updated.selectedDate = undefined;
          break;
        default:
          // @ts-expect-error - dynamic key assignment
          updated[key] = initialFilters[key];
      }

      return updated;
    });

    setAppliedFilters((prev) => {
      const updated = { ...prev };

      switch (key) {
        case "minAge":
        case "maxAge":
          updated.minAge = undefined;
          updated.maxAge = undefined;
          break;
        case "radius":
          updated.radius = undefined;
          updated.currentLat = undefined;
          updated.currentLng = undefined;
          updated.location = "";
          break;
        case "timeRange":
          updated.timeRange = [0, 1410];
          break;
        case "selectedDate":
          updated.selectedDate = undefined;
          break;
        default:
          // @ts-expect-error - dynamic key assignment
          updated[key] = initialFilters[key];
      }

      return updated;
    });
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.location) count++;
    if (filters.radius && filters.currentLat && filters.currentLng) count++;
    if (filters.gender) count++;
    if (filters.minAge !== undefined || filters.maxAge !== undefined) count++;
    if (filters.selectedDate) count++;
    if (filters.timeRange[0] !== 0 || filters.timeRange[1] !== 1410) count++;
    if (filters.hasProfilePic) count++;
    if (filters.onlineStatus) count++;
    if (filters.venue) count++;
    if (filters.type) count++;
    if (filters.minRating > 0) count++;

    return count;
  }, [filters]);

  // Check if filters have pending changes
  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.location !== "" ||
      appliedFilters.radius !== undefined ||
      appliedFilters.gender !== "" ||
      appliedFilters.minAge !== undefined ||
      appliedFilters.maxAge !== undefined ||
      appliedFilters.selectedDate !== undefined ||
      appliedFilters.timeRange[0] !== 0 ||
      appliedFilters.timeRange[1] !== 1410 ||
      appliedFilters.hasProfilePic !== "" ||
      appliedFilters.onlineStatus !== "" ||
      appliedFilters.venue !== "" ||
      appliedFilters.type !== "" ||
      appliedFilters.minRating > 0
    );
  }, [appliedFilters]);

  return {
    filters,
    setFilters,
    appliedFilters,
    setAppliedFilters,
    reset,
    removeFilter,
    activeFilterCount,
    hasPendingChanges,
    hasActiveFilters,
  };
}
